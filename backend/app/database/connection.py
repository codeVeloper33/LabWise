from app.database.base import db
from app.core.config import Config


def init_db(app):
    """Initialize the database and create all tables."""
    
    # --- CRITICAL ADDITIONS: Load the URI and SSL options ---
    app.config['SQLALCHEMY_DATABASE_URI'] = Config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = Config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = Config.SQLALCHEMY_ENGINE_OPTIONS
    # --------------------------------------------------------
    
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
