"""
Flutterwave payment service.

Handles initializing a payment for a tier upgrade and verifying
the result of a transaction. Flutterwave amounts are in whole
Naira units (NOT kobo, unlike Paystack).
"""

import uuid
import requests
from app.core.config import Config

FLW_BASE = "https://api.flutterwave.com/v3"

# Tier prices in Naira (whole units)
TIER_PRICES = {
    "tier1": 500,
    "tier2": 1500,
    "tier3": 3000,
}


def get_tier_price_ngn(tier: str) -> float:
    """Return the tier price in Naira (for display)."""
    return TIER_PRICES.get(tier, 0)


def initialize_payment(email: str, tier: str, callback_url: str) -> dict:
    """Initialize a Flutterwave Standard payment.

    Returns {success, authorization_url, reference} on success,
    or {success: False, error} on failure.
    """
    if tier not in TIER_PRICES:
        return {"success": False, "error": "Invalid tier"}

    tx_ref = f"labwise-{tier}-{uuid.uuid4().hex[:12]}"

    headers = {
        "Authorization": f"Bearer {Config.FLW_SECRET_KEY}",
        "Content-Type":  "application/json"
    }
    payload = {
        "tx_ref":       tx_ref,
        "amount":       TIER_PRICES[tier],
        "currency":     "NGN",
        "redirect_url": callback_url,
        "customer":     {"email": email},
        "customizations": {
            "title": "LabWise Upgrade",
            "description": f"LabWise {tier} subscription"
        },
        "meta": {"tier": tier}
    }

    try:
        resp = requests.post(
            f"{FLW_BASE}/payments",
            json=payload, headers=headers, timeout=10
        )
        data = resp.json()

        if data.get("status") == "success":
            return {
                "success":           True,
                "authorization_url": data["data"]["link"],
                "reference":         tx_ref
            }
        return {"success": False, "error": data.get("message", "Flutterwave error")}

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Could not reach Flutterwave: {e}"}


def verify_payment(transaction_id: str) -> dict:
    """Verify a Flutterwave transaction by its numeric transaction_id
    (returned to the redirect_url as the `transaction_id` query param —
    NOT the same as tx_ref).

    Returns {success, amount, email, tier, paid_at, tx_ref} on success,
    or {success: False, error} on failure.
    """
    headers = {"Authorization": f"Bearer {Config.FLW_SECRET_KEY}"}

    try:
        resp = requests.get(
            f"{FLW_BASE}/transactions/{transaction_id}/verify",
            headers=headers, timeout=10
        )
        data = resp.json()

        tx = data.get("data", {})
        if (
            data.get("status") == "success"
            and tx.get("status") == "successful"
            and tx.get("currency") == "NGN"
        ):
            return {
                "success": True,
                "amount":  tx["amount"],
                "email":   tx["customer"]["email"],
                "tier":    (tx.get("meta") or {}).get("tier"),
                "paid_at": tx.get("created_at"),
                "tx_ref":  tx.get("tx_ref"),
            }
        return {"success": False, "error": "Payment not successful"}

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Could not reach Flutterwave: {e}"}
