"""
Sessions router.

  POST   /api/sessions/                       — start a session (tier-checked)
  GET    /api/sessions/                       — list my sessions
  GET    /api/sessions/<id>                   — get one session
  POST   /api/sessions/<id>/readings          — record a reading
  DELETE /api/sessions/<id>/readings/last     — undo last reading
  POST   /api/sessions/<id>/finalize          — compute result + report
"""

from flask import Blueprint, request
from app.core.security import token_required
from app.models.user import User
from app.services.session_service import (
    create_session, get_session, get_user_sessions,
    add_reading, delete_last_reading, finalize_session
)
from app.services.tier_service import (
    can_access_experiment, can_start_session,
    validate_pendulum_params, validate_hookes_params, validate_moments_params,
    can_access_report
)
from app.utils.helpers import success, error

sessions_bp = Blueprint("sessions", __name__)


@sessions_bp.route("/", methods=["POST"])
@token_required
def start_session():
    data = request.get_json()
    if not data:
        return error("No data provided")

    experiment_name = data.get("experiment_name")
    config = data.get("config", {})

    if not experiment_name:
        return error("experiment_name is required")

    user = User.query.get(request.current_user["user_id"])
    tier = user.get_active_tier()

    # 1. Check experiment access
    if not can_access_experiment(tier, experiment_name):
        return error(
            f"This experiment is not available on your current plan ('{tier}'). "
            f"Please upgrade to access it.", 403
        )

    # 2. Check monthly session limit
    session_check = can_start_session(user)
    if not session_check["allowed"]:
        return error(session_check["error"], 403)

    # 3. Validate parameters against tier limits
    if experiment_name == "pendulum":
        # length_cm may not be set at creation time (student enters it per-trial
        # in the lab), but if provided we still validate it.
        length_cm = config.get("length_cm", 0)
        check = validate_pendulum_params(
            tier,
            length_cm,
            config.get("oscillations", 20),
            config.get("num_trials", 5)
        )
    elif experiment_name == "hookes":
        check = validate_hookes_params(
            tier,
            config.get("masses_g", []),
            config.get("num_trials", len(config.get("masses_g", [])) or 5)
        )
    elif experiment_name == "moments":
        check = validate_moments_params(
            tier,
            config.get("forces", []),
            config.get("num_trials", 5)
        )
    else:
        return error(f"Unknown experiment '{experiment_name}'", 404)

    if not check["valid"]:
        return error(check["error"], 403)

    try:
        session = create_session(user.id, experiment_name, config)
        return success({"session": session}, 201)
    except ValueError as e:
        return error(str(e))


@sessions_bp.route("/", methods=["GET"])
@token_required
def list_sessions():
    sessions = get_user_sessions(request.current_user["user_id"])
    return success({"sessions": sessions, "count": len(sessions)})


@sessions_bp.route("/<int:session_id>", methods=["GET"])
@token_required
def get_one_session(session_id):
    session = get_session(session_id, request.current_user["user_id"])
    if not session:
        return error("Session not found", 404)
    return success({"session": session.to_dict()})


@sessions_bp.route("/<int:session_id>/readings", methods=["POST"])
@token_required
def record_reading(session_id):
    data = request.get_json()
    if not data:
        return error("No data provided")

    user = User.query.get(request.current_user["user_id"])
    tier = user.get_active_tier()
    session = get_session(session_id, user.id)
    if not session:
        return error("Session not found", 404)

    # For pendulum, validate the length entered for THIS trial against tier limit
    if session.experiment.name == "pendulum" and "length_cm" in data:
        check = validate_pendulum_params(
            tier, data["length_cm"],
            session.config.get("oscillations", 20),
            session.config.get("num_trials", 5)
        )
        if not check["valid"]:
            return error(check["error"], 403)

    try:
        reading = add_reading(session_id, user.id, data)
        return success({"reading": reading}, 201)
    except ValueError as e:
        return error(str(e))


@sessions_bp.route("/<int:session_id>/readings/last", methods=["DELETE"])
@token_required
def undo_last_reading(session_id):
    try:
        result = delete_last_reading(session_id, request.current_user["user_id"])
        return success(result)
    except ValueError as e:
        return error(str(e))


@sessions_bp.route("/<int:session_id>/finalize", methods=["POST"])
@token_required
def finalize(session_id):
    user = User.query.get(request.current_user["user_id"])
    tier = user.get_active_tier()

    try:
        result = finalize_session(session_id, user.id)
        # Tell the frontend whether this tier can view the full report
        result["report_accessible"] = can_access_report(tier)
        return success({"session": result})
    except ValueError as e:
        return error(str(e))
    except Exception as e:
        return error(f"Server error: {str(e)}", 500)
