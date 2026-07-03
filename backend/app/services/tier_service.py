"""
Tier enforcement service.

Every limit check used by the routers goes through here, and every
limit value comes from app.core.config.Config.TIER_LIMITS — so the
whole tier system is configured in exactly one place.
"""

from app.core.config import Config


def get_tier_limits(tier: str) -> dict:
    """Return the limits dict for a tier, falling back to 'free'."""
    return Config.TIER_LIMITS.get(tier, Config.TIER_LIMITS["free"])


# ── Experiment access ─────────────────────────────────────────────

def can_access_experiment(tier: str, experiment_name: str) -> bool:
    limits = get_tier_limits(tier)
    return experiment_name in limits["experiments"]


# ── Session limits ─────────────────────────────────────────────────

def can_start_session(user) -> dict:
    """Check if a user can start a new session this calendar month."""
    user.reset_sessions_if_new_month()
    limits = get_tier_limits(user.get_active_tier())
    max_sessions = limits["sessions_per_month"]

    if user.sessions_this_month >= max_sessions:
        return {
            "allowed": False,
            "error": (
                f"You have used all {max_sessions} session"
                f"{'s' if max_sessions != 1 else ''} for this month on your "
                f"current plan. Upgrade to start more sessions."
            )
        }
    return {"allowed": True}


# ── Parameter validation ─────────────────────────────────────────────

def validate_pendulum_params(tier: str, length_cm: float, oscillations: int, num_trials: int) -> dict:
    """Validate pendulum parameters against the user's tier limits."""
    limits = get_tier_limits(tier)

    if length_cm and length_cm > limits["max_length_cm"]:
        return {
            "valid": False,
            "error": (
                f"Your plan allows a maximum pendulum length of "
                f"{limits['max_length_cm']} cm. Upgrade to use longer lengths."
            )
        }

    if oscillations not in limits["oscillation_options"]:
        opts = ", ".join(str(o) for o in limits["oscillation_options"])
        return {
            "valid": False,
            "error": (
                f"Your plan only allows {opts} oscillation"
                f"{'s' if len(limits['oscillation_options']) == 1 else 's'} per timing. "
                f"Upgrade for more options."
            )
        }

    if num_trials > limits["max_trials"]:
        return {
            "valid": False,
            "error": (
                f"Your plan allows a maximum of {limits['max_trials']} trials "
                f"per session. Upgrade for more."
            )
        }

    return {"valid": True}


def validate_hookes_params(tier: str, masses_g: list, num_trials: int) -> dict:
    """Validate Hooke's Law parameters against the user's tier limits."""
    limits   = get_tier_limits(tier)
    max_mass = limits["max_mass_g"]

    for mass in masses_g:
        if mass > max_mass:
            return {
                "valid": False,
                "error": (
                    f"Your plan allows masses up to {max_mass} g. "
                    f"Upgrade to use heavier masses."
                )
            }

    if num_trials > limits["max_trials"]:
        return {
            "valid": False,
            "error": (
                f"Your plan allows a maximum of {limits['max_trials']} trials "
                f"per session. Upgrade for more."
            )
        }

    return {"valid": True}


def validate_moments_params(tier: str, forces: list, num_trials: int) -> dict:
    """Validate Principle of Moments parameters against the user's tier limits."""
    limits    = get_tier_limits(tier)
    max_force = limits["max_force_n"]

    for force in forces:
        if force > max_force:
            return {
                "valid": False,
                "error": (
                    f"Your plan allows forces up to {max_force} N. "
                    f"Upgrade for larger forces."
                )
            }

    if num_trials > limits["max_trials"]:
        return {
            "valid": False,
            "error": (
                f"Your plan allows a maximum of {limits['max_trials']} trials "
                f"per session. Upgrade for more."
            )
        }

    return {"valid": True}


# ── Report / PDF access ─────────────────────────────────────────────

def can_access_report(tier: str) -> bool:
    return get_tier_limits(tier)["report"]


def can_export_pdf(tier: str) -> bool:
    return get_tier_limits(tier)["pdf"]


def can_save_sessions(tier: str) -> bool:
    return get_tier_limits(tier)["save_sessions"]


# ── Frontend-facing tier info ─────────────────────────────────────────

def get_tier_info_for_frontend(tier: str) -> dict:
    """Returns everything the frontend needs to enforce/display tier limits."""
    limits = get_tier_limits(tier)
    return {
        "tier":                tier,
        "experiments":         limits["experiments"],
        "max_length_cm":       limits["max_length_cm"],
        "max_mass_g":          limits["max_mass_g"],
        "max_force_n":         limits["max_force_n"],
        "max_trials":          limits["max_trials"],
        "sessions_per_month":  limits["sessions_per_month"],
        "oscillation_options": limits["oscillation_options"],
        "report":              limits["report"],
        "pdf":                 limits["pdf"],
        "save_sessions":       limits["save_sessions"],
    }
