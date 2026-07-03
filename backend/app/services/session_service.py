"""
Session service.

Handles the full lifecycle of a LabSession:
  1. create_session   — student starts an experiment with chosen config
  2. add_reading       — student records one trial
  3. delete_last_reading — undo
  4. finalize_session  — compute final result, graph data, and report
"""

from datetime import datetime
from app.database.base import db
from app.models.session import LabSession
from app.models.experiment import Experiment
from app.models.reading import Reading, Result
from app.models.user import User
from app.services.question_service import generate_question
from app.physics.formulas import (
    process_pendulum_reading, finalize_pendulum,
    process_hookes_reading, finalize_hookes,
    process_moments_reading, finalize_moments
)


def create_session(user_id: int, experiment_name: str, config: dict) -> dict:
    """Create a new lab session with an auto-generated question."""
    exp = Experiment.query.filter_by(name=experiment_name).first()
    if not exp:
        raise ValueError(f"Experiment '{experiment_name}' not found")

    user = User.query.get(user_id)
    if not user:
        raise ValueError("User not found")

    # Count this session towards the user's monthly limit
    user.sessions_this_month += 1

    # Generate the WAEC-style question from the chosen parameters
    question = generate_question(experiment_name, config)

    session = LabSession(
        user_id=user_id,
        experiment_id=exp.id,
        status="in_progress",
        config=config,
        question=question
    )
    db.session.add(session)
    db.session.commit()
    return session.to_dict()


def get_session(session_id: int, user_id: int):
    """Fetch a session belonging to this user, or None."""
    return LabSession.query.filter_by(id=session_id, user_id=user_id).first()


def get_user_sessions(user_id: int) -> list:
    """All sessions for a user, most recent first."""
    sessions = (
        LabSession.query
        .filter_by(user_id=user_id)
        .order_by(LabSession.created_at.desc())
        .all()
    )
    return [s.to_dict() for s in sessions]


def add_reading(session_id: int, user_id: int, inputs: dict) -> dict:
    """Process and store one trial's reading."""
    session = get_session(session_id, user_id)
    if not session:
        raise ValueError("Session not found")
    if session.status == "completed":
        raise ValueError("This session is already completed")

    exp_name     = session.experiment.name
    trial_number = len(session.readings) + 1

    if exp_name == "pendulum":
        oscillations = session.config.get("oscillations", 20)
        # WAEC format: single timing t, student calculates T and T²
        data = process_pendulum_reading(
            length_cm    = inputs["length_cm"],
            t            = inputs["t"],
            oscillations = oscillations,
            student_T    = inputs["student_T"],
            student_T2   = inputs["student_T2"],
        )
    elif exp_name == "hookes":
        data = process_hookes_reading(
            inputs["mass_g"],
            inputs["new_length_cm"],
            session.config["natural_length_cm"]
        )
    elif exp_name == "moments":
        data = process_moments_reading(
            inputs["f1"], inputs["d1_cm"],
            inputs["f2"], inputs["d2_cm"]
        )
    else:
        raise ValueError(f"Unknown experiment: {exp_name}")

    reading = Reading(
        session_id=session_id,
        trial_number=trial_number,
        raw_inputs=data["raw_inputs"],
        adjusted_inputs=data["adjusted_inputs"],
        calculated=data["calculated"]
    )
    db.session.add(reading)
    db.session.commit()
    return reading.to_dict()


def delete_last_reading(session_id: int, user_id: int) -> dict:
    """Remove the most recently recorded reading (undo)."""
    session = get_session(session_id, user_id)
    if not session or not session.readings:
        raise ValueError("No readings to delete")

    last  = session.readings[-1]
    trial = last.trial_number
    db.session.delete(last)
    db.session.commit()
    return {"deleted_trial": trial}


def finalize_session(session_id: int, user_id: int) -> dict:
    """Compute the final result, graph data, and full report for a session."""
    session = get_session(session_id, user_id)
    if not session:
        raise ValueError("Session not found")
    if len(session.readings) < 3:
        raise ValueError("Need at least 3 readings to finalize")

    readings = [r.to_dict() for r in session.readings]
    exp_name = session.experiment.name

    finalizers = {
        "pendulum": finalize_pendulum,
        "hookes":   finalize_hookes,
        "moments":  finalize_moments,
    }
    finalizer = finalizers.get(exp_name)
    if not finalizer:
        raise ValueError(f"Unknown experiment: {exp_name}")

    final = finalizer(readings)

    # Generate the full WAEC-style report
    from app.services.report_service import generate_report
    report = generate_report(session, readings, final)
    final["report"] = report

    result = Result(
        session_id=session_id,
        result_value=final["result_value"],
        uncertainty=final["uncertainty"],
        unit=final["unit"],
        graph_data=final["graph_data"],
        report=report
    )
    db.session.add(result)

    session.status       = "completed"
    session.completed_at = datetime.utcnow()
    session.final_result = {
        "result_value": final["result_value"],
        "uncertainty":  final["uncertainty"],
        "unit":         final["unit"],
        "summary":      final.get("summary", {})
    }
    db.session.commit()

    return {**session.to_dict(), "final": final}
