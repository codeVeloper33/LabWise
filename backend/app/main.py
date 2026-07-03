"""
LabWise API — main application factory.

Registers all blueprints, initializes the database, and seeds the
three experiments (with their min_tier requirements) on startup.
"""

from flask import Flask
from flask_cors import CORS
from app.core.config import Config
from app.database.connection import init_db
from app.database.base import db
from app.mail.mailer import mail
from app.routers.auth import auth_bp, bcrypt
from app.routers.experiments import experiments_bp
from app.routers.sessions import sessions_bp
from app.routers.users import users_bp
from app.routers.subscriptions import subscriptions_bp


# ── Experiment seed data ──────────────────────────────────────────

EXPERIMENT_SEED_DATA = [
    {
        "name": "pendulum",
        "title": "Simple Pendulum",
        "aim": "To determine the acceleration due to gravity (g) using a simple pendulum.",
        "theory": (
            "A simple pendulum consists of a small dense bob suspended by a light "
            "inextensible string from a fixed point. When displaced slightly and "
            "released, it oscillates with a period T given by T = 2π√(L/g), where "
            "L is the length of the pendulum and g is the acceleration due to "
            "gravity. Squaring both sides: T² = (4π²/g) × L. A graph of T² against "
            "L is a straight line through the origin with gradient = 4π²/g, from "
            "which g can be determined."
        ),
        "formula": "g = 4π²L / T²",
        "formula_explained": (
            "g = acceleration due to gravity (m/s²)\n"
            "L = length of pendulum from pivot to centre of bob (m)\n"
            "T = period of one complete oscillation (s)\n"
            "T = (time for n oscillations) ÷ n"
        ),
        "apparatus": [
            "Retort stand with clamp",
            "Pendulum bob (dense metal sphere)",
            "Inextensible thread (about 150 cm)",
            "Metre rule",
            "Stopwatch",
            "Protractor",
            "Split cork (to grip the thread)"
        ],
        "precautions": [
            "Ensure the amplitude of swing is small (less than 10°) so the motion is truly simple harmonic",
            "Count oscillations carefully — one complete oscillation is a full back-and-forth swing",
            "Measure the length from the pivot point to the centre of the bob, not just the string length",
            "Repeat timing three times for each length and take the average to reduce random error",
            "Keep the pendulum swinging in one plane — avoid circular motion",
            "Avoid draughts in the room that could affect the swing"
        ],
        "sources_of_error": [
            "Human reaction time error when starting/stopping the stopwatch",
            "Parallax error when reading the metre rule",
            "The bob may not swing in a perfect plane (3D motion introduces error)",
            "Air resistance slightly increases the period",
            "The string may not be perfectly inextensible"
        ],
        "result_unit": "m/s²",
        "result_label": "Acceleration due to gravity (g)",
        "min_tier": "free"
    },
    {
        "name": "hookes",
        "title": "Hooke's Law",
        "aim": "To verify Hooke's Law and determine the spring constant (k) of a given spring.",
        "theory": (
            "Hooke's Law states that the extension of a spring is directly "
            "proportional to the applied force, provided the elastic limit is not "
            "exceeded: F = kx, where F is the applied force (N), x is the "
            "extension (m), and k is the spring constant (N/m). A graph of Force F "
            "against extension x gives a straight line through the origin with "
            "gradient = k."
        ),
        "formula": "k = F / x",
        "formula_explained": (
            "k = spring constant (N/m)\n"
            "F = applied force = mg (N)\n"
            "m = mass of load (kg)\n"
            "g = 9.81 m/s²\n"
            "x = extension = new length − natural length (m)"
        ),
        "apparatus": [
            "Helical spring",
            "Retort stand with clamp",
            "Metre rule (attached vertically beside spring)",
            "Set of masses",
            "Mass hanger",
            "Pointer (attached to bottom of spring for accurate reading)"
        ],
        "precautions": [
            "Record the natural length of the spring before adding any mass",
            "Add masses gently to avoid oscillation — wait for spring to settle before reading",
            "Read the scale at eye level to avoid parallax error",
            "Do not exceed the elastic limit — if the spring does not return to its natural length, stop",
            "Keep the spring vertical throughout the experiment",
            "Take readings while loading AND while unloading to check for elastic behaviour"
        ],
        "sources_of_error": [
            "Parallax error when reading the metre rule",
            "Spring may not be perfectly vertical",
            "Oscillation of masses causes inaccurate readings if not waited for settling",
            "Masses may not be exactly as labelled"
        ],
        "result_unit": "N/m",
        "result_label": "Spring constant (k)",
        "min_tier": "tier1"
    },
    {
        "name": "moments",
        "title": "Principle of Moments",
        "aim": "To verify the Principle of Moments using a pivoted metre rule.",
        "theory": (
            "The Principle of Moments states that for a body in rotational "
            "equilibrium, the sum of clockwise moments about any point equals the "
            "sum of anticlockwise moments about the same point. A moment = Force × "
            "perpendicular distance from pivot. For equilibrium: F₁ × d₁ = F₂ × d₂, "
            "where F₁ and F₂ are forces on opposite sides of the pivot, and d₁ and "
            "d₂ are their distances from the pivot."
        ),
        "formula": "F₁ × d₁ = F₂ × d₂",
        "formula_explained": (
            "F₁ = anticlockwise force (N)\n"
            "d₁ = distance of F₁ from pivot (m)\n"
            "F₂ = clockwise force (N)\n"
            "d₂ = distance of F₂ from pivot (m)\n"
            "Moments are equal when the rule is balanced (horizontal)"
        ),
        "apparatus": [
            "Uniform metre rule",
            "Knife-edge pivot (at 50 cm mark)",
            "Sets of known masses",
            "Mass hangers with hooks",
            "Plumb line (to check vertical alignment of hanging masses)"
        ],
        "precautions": [
            "Ensure the metre rule is balanced at the pivot before adding any masses",
            "Hang masses carefully so they hang vertically and do not swing",
            "Read distances accurately from the pivot to the point of suspension",
            "Ensure the rule is horizontal before recording each reading",
            "Use a plumb line to confirm masses hang vertically"
        ],
        "sources_of_error": [
            "The metre rule may not be perfectly uniform (affects the balance point)",
            "Parallax error when reading distances on the metre rule",
            "Masses may not hang exactly vertically",
            "Friction at the pivot may prevent exact balancing"
        ],
        "result_unit": "%",
        "result_label": "Average % difference between moments",
        "min_tier": "tier1"
    }
]


def seed_experiments(app):
    """Insert or update the 3 experiments on every startup."""
    from app.models.experiment import Experiment
    with app.app_context():
        for data in EXPERIMENT_SEED_DATA:
            exp = Experiment.query.filter_by(name=data["name"]).first()
            if not exp:
                db.session.add(Experiment(**data))
            else:
                for k, v in data.items():
                    setattr(exp, k, v)
        db.session.commit()
        print("✅ Experiments seeded")


# ── App factory ─────────────────────────────────────────────────

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    bcrypt.init_app(app)
    mail.init_app(app)
    init_db(app)
    seed_experiments(app)

    app.register_blueprint(auth_bp,          url_prefix="/api/auth")
    app.register_blueprint(experiments_bp,   url_prefix="/api/experiments")
    app.register_blueprint(sessions_bp,      url_prefix="/api/sessions")
    app.register_blueprint(users_bp,         url_prefix="/api/users")
    app.register_blueprint(subscriptions_bp, url_prefix="/api/subscriptions")

    @app.route("/")
    def health():
        return {"status": "LabWise API v3 ✅", "version": "3.0.0"}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=Config.DEBUG, port=5000)
