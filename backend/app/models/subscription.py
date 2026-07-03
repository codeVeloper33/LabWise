from datetime import datetime
from app.database.base import db


class Subscription(db.Model):
    """A Flutterwave subscription/payment record. One row per payment attempt."""
    __tablename__ = "subscriptions"

    id     = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    tier       = db.Column(db.String(20), nullable=False)  # tier1 | tier2 | tier3
    amount_ngn = db.Column(db.Integer, nullable=False)      # amount in whole Naira (Flutterwave standard)

    paystack_reference = db.Column(db.String(100), unique=True, nullable=False)  # holds the Flutterwave tx_ref
    paystack_status    = db.Column(db.String(20), default="pending")  # pending | success | failed

    started_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":                 self.id,
            "tier":               self.tier,
            "amount_ngn":         self.amount_ngn,
            "paystack_reference": self.paystack_reference,
            "paystack_status":    self.paystack_status,
            "started_at":         self.started_at.isoformat() if self.started_at else None,
            "expires_at":         self.expires_at.isoformat() if self.expires_at else None,
            "created_at":         self.created_at.isoformat(),
        }
