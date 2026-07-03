import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from app.core.config import Config


def generate_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email":   email,
        "exp":     datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRY_HOURS),
        "iat":     datetime.datetime.utcnow()
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        return {"valid": True, "payload": payload}
    except jwt.ExpiredSignatureError:
        return {"valid": False, "error": "Token expired. Please log in again."}
    except jwt.InvalidTokenError:
        return {"valid": False, "error": "Invalid token."}


def token_required(f):
    """Decorator for routes that require a valid JWT in the Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"success": False, "error": "Authentication token missing"}), 401

        result = decode_token(token)
        if not result["valid"]:
            return jsonify({"success": False, "error": result["error"]}), 401

        request.current_user = result["payload"]
        return f(*args, **kwargs)
    return decorated
