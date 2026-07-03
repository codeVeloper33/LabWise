from app.database.base import db


def init_db(app):
    """Initialize the database and create all tables."""
    db.init_app(app)
    with app.app_context():
        # Import all models so SQLAlchemy registers them before create_all()
        from app.models.user import User
        from app.models.verification import VerificationCode
        from app.models.experiment import Experiment
        from app.models.session import LabSession
        from app.models.reading import Reading, Result
        from app.models.subscription import Subscription

        db.create_all()
        print("✅ Database tables created")
