from datetime import datetime
from app.database.base import db


class LabSession(db.Model):
    __tablename__ = "lab_sessions"

    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey("users.id"),       nullable=False)
    experiment_id = db.Column(db.Integer, db.ForeignKey("experiments.id"), nullable=False)

    status = db.Column(db.String(20), default="in_progress")  # in_progress | completed

    # Parameters chosen on the Create Experiment page
    config = db.Column(db.JSON, nullable=False, default=dict)

    # WAEC-style question auto-generated from config — stays visible during the lab
    question = db.Column(db.JSON, nullable=True)

    # Final computed result + summary (set when finalized)
    final_result = db.Column(db.JSON, nullable=True)

    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    readings = db.relationship(
        "Reading", backref="session", lazy=True,
        cascade="all, delete-orphan",
        order_by="Reading.trial_number"
    )
    result = db.relationship(
        "Result", backref="session", lazy=True,
        cascade="all, delete-orphan", uselist=False
    )

    def to_dict(self):
        return {
            "id":               self.id,
            "user_id":          self.user_id,
            "experiment_id":    self.experiment_id,
            "experiment_name":  self.experiment.name  if self.experiment else None,
            "experiment_title": self.experiment.title if self.experiment else None,
            "status":           self.status,
            "config":           self.config,
            "question":         self.question,
            "final_result":     self.final_result,
            "readings":         [r.to_dict() for r in self.readings],
            "created_at":       self.created_at.isoformat(),
            "completed_at":     self.completed_at.isoformat() if self.completed_at else None,
        }
