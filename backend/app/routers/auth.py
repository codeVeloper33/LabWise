"""
Auth router.

  POST /api/auth/signup           — create account, send verification code
  POST /api/auth/verify            — verify email with 6-digit code -> JWT
  POST /api/auth/resend-code       — resend a signup verification code
  POST /api/auth/login             — login -> JWT (blocks unverified accounts)
  POST /api/auth/forgot-password   — send a password reset code
  POST /api/auth/reset-password    — reset password using the code
"""

from flask import Blueprint, request
from flask_bcrypt import Bcrypt
from app.models.user import User
from app.models.verification import VerificationCode
from app.database.base import db
from app.core.security import generate_token
from app.mail.mailer import send_verification_email, send_password_reset_email
from app.utils.helpers import success, error

auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    if not data:
        return error("No data provided")

    username = data.get("username", "").strip()
    email    = data.get("email", "").strip().lower()
    phone    = data.get("phone", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return error("Username, email and password are required")
    if len(username) < 3:
        return error("Username must be at least 3 characters")
    if len(password) < 6:
        return error("Password must be at least 6 characters")
    if User.query.filter_by(email=email).first():
        return error("An account with this email already exists")
    if User.query.filter_by(username=username).first():
        return error("This username is already taken")

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(
        username=username, email=email, phone=phone or None,
        password_hash=password_hash, is_verified=False
    )
    db.session.add(user)
    db.session.commit()

    vcode = VerificationCode.generate(user.id, "signup")
    db.session.add(vcode)
    db.session.commit()

    email_sent = send_verification_email(user.email, user.username, vcode.code)

    return success({
        "user": user.to_dict(),
        "verification_required": True,
        "email_sent": email_sent,
        "message": "Account created. Check your email for a verification code."
    }, 201)


@auth_bp.route("/verify", methods=["POST"])
def verify():
    data  = request.get_json()
    if not data:
        return error("No data provided")

    email = data.get("email", "").strip().lower()
    code  = data.get("code", "").strip()

    if not email or not code:
        return error("Email and code are required")

    user = User.query.filter_by(email=email).first()
    if not user:
        return error("User not found", 404)

    if user.is_verified:
        token = generate_token(user.id, user.email)
        return success({"token": token, "user": user.to_dict(), "already_verified": True})

    vcode = (
        VerificationCode.query
        .filter_by(user_id=user.id, code=code, purpose="signup", used=False)
        .order_by(VerificationCode.created_at.desc())
        .first()
    )

    if not vcode or not vcode.is_valid():
        return error("Invalid or expired verification code", 400)

    vcode.used = True
    user.is_verified = True
    db.session.commit()

    token = generate_token(user.id, user.email)
    return success({"token": token, "user": user.to_dict()})


@auth_bp.route("/resend-code", methods=["POST"])
def resend_code():
    data  = request.get_json()
    email = data.get("email", "").strip().lower()

    user = User.query.filter_by(email=email).first()
    if not user:
        return error("User not found", 404)
    if user.is_verified:
        return error("Account already verified")

    vcode = VerificationCode.generate(user.id, "signup")
    db.session.add(vcode)
    db.session.commit()

    email_sent = send_verification_email(user.email, user.username, vcode.code)
    return success({"email_sent": email_sent, "message": "A new code has been sent to your email."})


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return error("No data provided")

    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return error("Email and password are required")

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return error("Invalid email or password", 401)

    if not user.is_verified:
        return success({
            "verification_required": True,
            "email": user.email,
            "message": "Please verify your email first."
        }, 403)

    token = generate_token(user.id, user.email)
    return success({"token": token, "user": user.to_dict()})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data  = request.get_json()
    email = data.get("email", "").strip().lower()

    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal whether the email exists
        return success({"message": "If this email exists, a reset code has been sent."})

    vcode = VerificationCode.generate(user.id, "reset_password")
    db.session.add(vcode)
    db.session.commit()

    send_password_reset_email(user.email, user.username, vcode.code)
    return success({"message": "If this email exists, a reset code has been sent."})


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data         = request.get_json()
    email        = data.get("email", "").strip().lower()
    code         = data.get("code", "").strip()
    new_password = data.get("new_password", "")

    if len(new_password) < 6:
        return error("Password must be at least 6 characters")

    user = User.query.filter_by(email=email).first()
    if not user:
        return error("Invalid request", 400)

    vcode = (
        VerificationCode.query
        .filter_by(user_id=user.id, code=code, purpose="reset_password", used=False)
        .order_by(VerificationCode.created_at.desc())
        .first()
    )

    if not vcode or not vcode.is_valid():
        return error("Invalid or expired code", 400)

    vcode.used = True
    user.password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.session.commit()

    return success({"message": "Password reset successfully. You can now log in."})
