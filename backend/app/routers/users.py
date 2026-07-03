"""
Users router.

  GET /api/users/me            — current user profile + tier info
  GET /api/users/me/sessions   — all of my sessions
  PUT /api/users/me/settings   — update username/email/phone/password/theme/auto_login
"""

from flask import Blueprint, request
from flask_bcrypt import Bcrypt
from app.core.security import token_required
from app.models.user import User
from app.database.base import db
from app.services.session_service import get_user_sessions
from app.services.tier_service import get_tier_info_for_frontend
from app.utils.helpers import success, error

users_bp = Blueprint("users", __name__)
bcrypt = Bcrypt()


@users_bp.route("/me", methods=["GET"])
@token_required
def get_me():
    user = User.query.get(request.current_user["user_id"])
    if not user:
        return error("User not found", 404)

    user.is_tier_active()  # auto-downgrade if expired
    d = user.to_dict()
    d["tier_info"] = get_tier_info_for_frontend(user.get_active_tier())
    return success({"user": d})


@users_bp.route("/me/sessions", methods=["GET"])
@token_required
def get_my_sessions():
    sessions = get_user_sessions(request.current_user["user_id"])
    return success({"sessions": sessions, "count": len(sessions)})


@users_bp.route("/me/settings", methods=["PUT"])
@token_required
def update_settings():
    """Update username, email, phone, password, theme, or auto_login."""
    data = request.get_json()
    if not data:
        return error("No data provided")

    user = User.query.get(request.current_user["user_id"])
    if not user:
        return error("User not found", 404)

    if "username" in data and data["username"].strip():
        new_username = data["username"].strip()
        if new_username != user.username:
            if User.query.filter_by(username=new_username).first():
                return error("Username already taken")
            user.username = new_username

    if "email" in data and data["email"].strip():
        new_email = data["email"].strip().lower()
        if new_email != user.email:
            if User.query.filter_by(email=new_email).first():
                return error("Email already in use")
            user.email = new_email
            user.is_verified = False  # require re-verification on email change

    if "phone" in data:
        user.phone = data["phone"].strip() or None

    if "theme" in data and data["theme"] in ("dark", "light", "system"):
        user.theme = data["theme"]

    if "auto_login" in data:
        user.auto_login = bool(data["auto_login"])

    if "current_password" in data and "new_password" in data:
        if not bcrypt.check_password_hash(user.password_hash, data["current_password"]):
            return error("Current password is incorrect")
        if len(data["new_password"]) < 6:
            return error("New password must be at least 6 characters")
        user.password_hash = bcrypt.generate_password_hash(data["new_password"]).decode("utf-8")

    db.session.commit()
    return success({"user": user.to_dict()})
