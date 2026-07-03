import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql://postgres:labwise123@localhost:5432/labwise3"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # REQUIRED FOR RENDER POSTGRESQL SSL CONNECTION
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"sslmode": "require"}
    }

    # JWT
    JWT_SECRET_KEY   = os.getenv("JWT_SECRET_KEY", "fallback-secret")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))

    # Flask
    DEBUG = os.getenv("FLASK_DEBUG", "False") == "True"
    ENV   = os.getenv("FLASK_ENV", "production")

    # Mail
    MAIL_SERVER         = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT           = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS        = os.getenv("MAIL_USE_TLS", "True") == "True"
    MAIL_USERNAME       = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD       = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "")

    # Flutterwave
    FLW_PUBLIC_KEY   = os.getenv("FLW_PUBLIC_KEY", "")
    FLW_SECRET_KEY   = os.getenv("FLW_SECRET_KEY", "")
    FLW_WEBHOOK_HASH = os.getenv("FLW_WEBHOOK_HASH", "")

    # ── Tier limits ────────────────────────────────────────────
    # Every tier limit used anywhere in the app comes from here.
    TIER_LIMITS = {
        "free": {
            "experiments":         ["pendulum"],
            "max_length_cm":       50,
            "max_mass_g":          50,
            "max_force_n":         3,
            "max_trials":          3,
            "sessions_per_month":  2,
            "oscillation_options": [10],
            "report":              False,
            "pdf":                 False,
            "save_sessions":       False,
        },
        "tier1": {
            "experiments":         ["pendulum", "hookes", "moments"],
            "max_length_cm":       100,
            "max_mass_g":          200,
            "max_force_n":         6,
            "max_trials":          5,
            "sessions_per_month":  10,
            "oscillation_options": [10, 20],
            "report":              True,
            "pdf":                 False,
            "save_sessions":       True,
        },
        "tier2": {
            "experiments":         ["pendulum", "hookes", "moments"],
            "max_length_cm":       150,
            "max_mass_g":          350,
            "max_force_n":         9,
            "max_trials":          8,
            "sessions_per_month":  30,
            "oscillation_options": [10, 20, 30, 50],
            "report":              True,
            "pdf":                 False,
            "save_sessions":       True,
        },
        "tier3": {
            "experiments":         ["pendulum", "hookes", "moments"],
            "max_length_cm":       200,
            "max_mass_g":          500,
            "max_force_n":         15,
            "max_trials":          999,
            "sessions_per_month":  9999,
            "oscillation_options": list(range(5, 101, 5)),
            "report":              True,
            "pdf":                 True,
            "save_sessions":       True,
        },
    }
