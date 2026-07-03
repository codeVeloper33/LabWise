from datetime import datetime
from app.database.base import db


class Reading(db.Model):
    """A single recorded trial within a lab session."""
    __tablename__ = "readings"

    id              = db.Column(db.Integer, primary_key=True)
    session_id      = db.Column(db.Integer, db.ForeignKey("lab_sessions.id"), nullable=False)
    trial_number    = db.Column(db.Integer, nullable=False)

    raw_inputs      = db.Column(db.JSON, nullable=False)  # exactly what the student entered
    adjusted_inputs = db.Column(db.JSON, nullable=False)  # after realistic error simulation
    calculated      = db.Column(db.JSON, nullable=False)  # derived values (T, T², g, k, moments, etc.)

    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":              self.id,
            "session_id":      self.session_id,
            "trial_number":    self.trial_number,
            "raw_inputs":      self.raw_inputs,
            "adjusted_inputs": self.adjusted_inputs,
            "calculated":      self.calculated,
            "recorded_at":     self.recorded_at.isoformat()
        }


class Result(db.Model):
    """The final computed result for a completed session, including
    graph data and the full generated report."""
    __tablename__ = "results"

    id           = db.Column(db.Integer, primary_key=True)
    session_id   = db.Column(db.Integer, db.ForeignKey("lab_sessions.id"), nullable=False, unique=True)

    result_value = db.Column(db.Float,   nullable=False)
    uncertainty  = db.Column(db.Float,   nullable=False)
    unit         = db.Column(db.String(30), nullable=False)

    graph_data = db.Column(db.JSON, nullable=False)
    report     = db.Column(db.JSON, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":           self.id,
            "session_id":   self.session_id,
            "result_value": round(self.result_value, 4),
            "uncertainty":  round(self.uncertainty,  4),
            "unit":         self.unit,
            "graph_data":   self.graph_data,
            "report":       self.report,
            "created_at":   self.created_at.isoformat()
        }
