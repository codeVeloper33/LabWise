from datetime import datetime
from app.database.base import db


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80),  unique=True, nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    phone         = db.Column(db.String(20),  nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_verified   = db.Column(db.Boolean, default=False)

    # Tier: free | tier1 | tier2 | tier3
    tier                 = db.Column(db.String(20), default="free")
    tier_expires_at      = db.Column(db.DateTime, nullable=True)
    sessions_this_month  = db.Column(db.Integer, default=0)
    last_session_reset   = db.Column(db.DateTime, default=datetime.utcnow)

    # Settings
    theme      = db.Column(db.String(10), default="dark")   # dark | light | system
    auto_login = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    sessions      = db.relationship("LabSession",      backref="user", lazy=True, cascade="all, delete-orphan")
    subscriptions = db.relationship("Subscription",    backref="user", lazy=True, cascade="all, delete-orphan")
    verifications = db.relationship("VerificationCode", backref="user", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":                   self.id,
            "username":             self.username,
            "email":                self.email,
            "phone":                self.phone,
            "is_verified":          self.is_verified,
            "tier":                 self.tier,
            "tier_expires_at":      self.tier_expires_at.isoformat() if self.tier_expires_at else None,
            "sessions_this_month":  self.sessions_this_month,
            "theme":                self.theme,
            "auto_login":           self.auto_login,
            "created_at":           self.created_at.isoformat()
        }

    def is_tier_active(self) -> bool:
        """Returns True if the user's paid tier is still active.
        Auto-downgrades to free if expired."""
        if self.tier == "free":
            return True
        if self.tier_expires_at and datetime.utcnow() > self.tier_expires_at:
            self.tier = "free"
            self.tier_expires_at = None
            db.session.commit()
            return False
        return True

    def get_active_tier(self) -> str:
        if not self.is_tier_active():
            return "free"
        return self.tier

    def reset_sessions_if_new_month(self):
        now  = datetime.utcnow()
        last = self.last_session_reset
        if last.month != now.month or last.year != now.year:
            self.sessions_this_month = 0
            self.last_session_reset  = now
            db.session.commit()
