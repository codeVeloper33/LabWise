"""
Subscriptions router.

  GET  /api/subscriptions/plans              — public: list all plans + pricing
  POST /api/subscriptions/initialize                — start a Flutterwave payment
  GET  /api/subscriptions/verify/<transaction_id>    — verify payment, upgrade tier
  POST /api/subscriptions/webhook                    — Flutterwave webhook (auto-upgrade)
  GET  /api/subscriptions/history                    — my payment history
"""

from flask import Blueprint, request
from datetime import datetime, timedelta
from app.core.security import token_required
from app.core.config import Config
from app.models.user import User
from app.models.subscription import Subscription
from app.database.base import db
from app.services.flutterwave_service import (
    initialize_payment, verify_payment, TIER_PRICES, get_tier_price_ngn
)
from app.utils.helpers import success, error

subscriptions_bp = Blueprint("subscriptions", __name__)

TIER_NAMES = {
    "free":  "Free",
    "tier1": "Tier 1 — Basic",
    "tier2": "Tier 2 — Standard",
    "tier3": "Tier 3 — Premium",
}


@subscriptions_bp.route("/plans", methods=["GET"])
def get_plans():
    """Public endpoint — list all available plans with pricing and limits."""
    plans = []
    for tier, limits in Config.TIER_LIMITS.items():
        plans.append({
            "tier":      tier,
            "name":      TIER_NAMES.get(tier, tier),
            "price_ngn": get_tier_price_ngn(tier) if tier != "free" else 0,
            "limits":    limits
        })
    return success({"plans": plans})


@subscriptions_bp.route("/initialize", methods=["POST"])
@token_required
def initialize():
    data = request.get_json()
    tier = data.get("tier")
    callback_url = data.get("callback_url", "http://localhost:3000/pages/upgrade.html")

    if tier not in TIER_PRICES:
        return error("Invalid tier selected")

    user = User.query.get(request.current_user["user_id"])
    if not user:
        return error("User not found", 404)

    result = initialize_payment(user.email, tier, callback_url)
    if not result["success"]:
        return error(result["error"], 500)

    # Create a pending subscription record
    sub = Subscription(
        user_id=user.id,
        tier=tier,
        amount_ngn=TIER_PRICES[tier],
        paystack_reference=result["reference"],
        paystack_status="pending"
    )
    db.session.add(sub)
    db.session.commit()

    return success({
        "authorization_url": result["authorization_url"],
        "reference":         result["reference"]
    })


@subscriptions_bp.route("/verify/<transaction_id>", methods=["GET"])
@token_required
def verify(transaction_id):
    result = verify_payment(transaction_id)

    # Flutterwave verify is keyed by the numeric transaction_id, but our
    # Subscription row is keyed by tx_ref (returned inside the verify result).
    tx_ref = result.get("tx_ref") if result.get("success") else request.args.get("tx_ref")
    sub = Subscription.query.filter_by(paystack_reference=tx_ref).first() if tx_ref else None

    if not sub:
        return error("Subscription record not found", 404)

    if not result["success"]:
        sub.paystack_status = "failed"
        db.session.commit()
        return error("Payment verification failed")

    # Extra safety: amount/tier sanity check against what we initialized
    if result["tier"] != sub.tier or int(result["amount"]) != int(sub.amount_ngn):
        sub.paystack_status = "failed"
        db.session.commit()
        return error("Payment amount/tier mismatch — verification rejected")

    # Mark subscription successful
    sub.paystack_status = "success"
    sub.started_at = datetime.utcnow()
    sub.expires_at = datetime.utcnow() + timedelta(days=30)
    db.session.commit()

    # Upgrade the user's tier
    user = User.query.get(sub.user_id)
    user.tier = sub.tier
    user.tier_expires_at = sub.expires_at
    db.session.commit()

    return success({
        "message": f"Successfully upgraded to {TIER_NAMES.get(sub.tier, sub.tier)}!",
        "user": user.to_dict()
    })


@subscriptions_bp.route("/webhook", methods=["POST"])
def webhook():
    """Flutterwave webhook — automatically upgrades the user's tier on
    charge.completed. Flutterwave signs webhooks with a verif-hash header
    that must match your configured secret hash (set in the Flutterwave
    dashboard webhook settings, not your API secret key)."""
    signature = request.headers.get("verif-hash", "")
    if not Config.FLW_WEBHOOK_HASH or signature != Config.FLW_WEBHOOK_HASH:
        return error("Invalid signature", 401)

    data = request.get_json()
    if not data:
        return success({"received": True})

    event = data.get("event")
    tx_data = data.get("data", {})

    if event == "charge.completed" and tx_data.get("status") == "successful":
        transaction_id = tx_data.get("id")
        result = verify_payment(transaction_id)

        if result["success"]:
            sub = Subscription.query.filter_by(paystack_reference=result["tx_ref"]).first()
            if sub and sub.paystack_status != "success" and result["tier"] == sub.tier \
                    and int(result["amount"]) == int(sub.amount_ngn):
                sub.paystack_status = "success"
                sub.started_at = datetime.utcnow()
                sub.expires_at = datetime.utcnow() + timedelta(days=30)
                db.session.commit()

                user = User.query.get(sub.user_id)
                user.tier = sub.tier
                user.tier_expires_at = sub.expires_at
                db.session.commit()

    return success({"received": True})


@subscriptions_bp.route("/history", methods=["GET"])
@token_required
def history():
    subs = (
        Subscription.query
        .filter_by(user_id=request.current_user["user_id"])
        .order_by(Subscription.created_at.desc())
        .all()
    )
    return success({"subscriptions": [s.to_dict() for s in subs]})
