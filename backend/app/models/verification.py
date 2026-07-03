from datetime import datetime, timedelta
import random
from app.database.base import db


class VerificationCode(db.Model):
    __tablename__ = "verification_codes"

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    code       = db.Column(db.String(6), nullable=False)
    purpose    = db.Column(db.String(20), nullable=False)  # 'signup' | 'reset_password'
    expires_at = db.Column(db.DateTime, nullable=False)
    used       = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def generate(user_id: int, purpose: str) -> "VerificationCode":
        code       = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(minutes=15)
        return VerificationCode(
            user_id=user_id,
            code=code,
            purpose=purpose,
            expires_at=expires_at
        )

    def is_valid(self) -> bool:
        return not self.used and datetime.utcnow() < self.expires_at

    def to_dict(self):
        return {
            "id":         self.id,
            "purpose":    self.purpose,
            "expires_at": self.expires_at.isoformat(),
            "used":       self.used
        }
