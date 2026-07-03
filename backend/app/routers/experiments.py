"""
Experiments router.

  GET /api/experiments/        — list all experiments, with 'accessible' flag per tier
  GET /api/experiments/<name>  — get one experiment (403 if tier insufficient)
"""

from flask import Blueprint, request
from app.core.security import token_required
from app.models.experiment import Experiment
from app.models.user import User
from app.services.tier_service import can_access_experiment, get_tier_info_for_frontend
from app.utils.helpers import success, error

experiments_bp = Blueprint("experiments", __name__)


@experiments_bp.route("/", methods=["GET"])
@token_required
def list_experiments():
    user = User.query.get(request.current_user["user_id"])
    tier = user.get_active_tier()

    experiments = Experiment.query.all()
    result = []
    for exp in experiments:
        d = exp.to_dict()
        d["accessible"] = can_access_experiment(tier, exp.name)
        result.append(d)

    return success({
        "experiments": result,
        "tier_info": get_tier_info_for_frontend(tier)
    })


@experiments_bp.route("/<name>", methods=["GET"])
@token_required
def get_experiment(name):
    exp = Experiment.query.filter_by(name=name).first()
    if not exp:
        return error(f"Experiment '{name}' not found", 404)

    user = User.query.get(request.current_user["user_id"])
    tier = user.get_active_tier()

    if not can_access_experiment(tier, name):
        return error(
            f"This experiment requires a higher tier. Your current tier is '{tier}'. "
            f"Please upgrade to access {exp.title}.",
            403
        )

    d = exp.to_dict()
    d["tier_info"] = get_tier_info_for_frontend(tier)
    return success({"experiment": d})
