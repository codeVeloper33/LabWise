from app.database.base import db


class Experiment(db.Model):
    __tablename__ = "experiments"

    id                = db.Column(db.Integer, primary_key=True)
    name              = db.Column(db.String(50),  unique=True, nullable=False)  # pendulum | hookes | moments
    title             = db.Column(db.String(120), nullable=False)
    aim               = db.Column(db.Text,        nullable=False)
    theory            = db.Column(db.Text,        nullable=False)
    formula           = db.Column(db.String(200), nullable=False)
    formula_explained = db.Column(db.Text,        nullable=False)
    apparatus         = db.Column(db.JSON,        nullable=False)
    precautions       = db.Column(db.JSON,        nullable=False)
    sources_of_error  = db.Column(db.JSON,        nullable=False)
    result_unit       = db.Column(db.String(30),  nullable=False)
    result_label      = db.Column(db.String(80),  nullable=False)

    # Minimum tier required to access this experiment
    min_tier = db.Column(db.String(20), default="free")

    sessions = db.relationship("LabSession", backref="experiment", lazy=True)

    def to_dict(self):
        return {
            "id":                self.id,
            "name":              self.name,
            "title":             self.title,
            "aim":               self.aim,
            "theory":            self.theory,
            "formula":           self.formula,
            "formula_explained": self.formula_explained,
            "apparatus":         self.apparatus,
            "precautions":       self.precautions,
            "sources_of_error":  self.sources_of_error,
            "result_unit":       self.result_unit,
            "result_label":      self.result_label,
            "min_tier":          self.min_tier,
        }
