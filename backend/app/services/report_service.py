"""
Report generation service.

Builds the full WAEC-style practical report for a completed session:
aim, apparatus, theory, formula, precautions, sources of error, the
original question, and a conclusion written using the actual result
the student obtained.
"""


def generate_report(session, readings: list, final: dict) -> dict:
    """Assemble the full report dict for a finalized session."""
    exp     = session.experiment
    summary = final.get("summary", {})

    if exp.name == "pendulum":
        conclusion = _pendulum_conclusion(final, summary)
    elif exp.name == "hookes":
        conclusion = _hookes_conclusion(final, summary)
    elif exp.name == "moments":
        conclusion = _moments_conclusion(final, summary)
    else:
        conclusion = "Experiment completed."

    return {
        "aim":               exp.aim,
        "apparatus":         exp.apparatus,
        "theory":            exp.theory,
        "formula":           exp.formula,
        "formula_explained": exp.formula_explained,
        "precautions":       exp.precautions,
        "sources_of_error":  exp.sources_of_error,
        "question":          session.question,
        "conclusion":        conclusion,
        "result_label":      exp.result_label,
        "result_value":      final["result_value"],
        "unit":              final["unit"],
        "uncertainty":       final["uncertainty"]
    }


def _pendulum_conclusion(final: dict, summary: dict) -> str:
    return (
        f"The value of the acceleration due to gravity obtained from this experiment is "
        f"g = {final['result_value']} ± {final['uncertainty']} m/s². "
        f"The standard value of g is 9.81 m/s². "
        f"The percentage error is {summary.get('percentage_error', 'N/A')}%. "
        f"The slight difference is due to measurement errors such as human reaction "
        f"time in operating the stopwatch and parallax error in measuring the length "
        f"of the pendulum."
    )


def _hookes_conclusion(final: dict, summary: dict) -> str:
    return (
        f"The spring constant obtained from the gradient of the F vs x graph is "
        f"k = {final['result_value']} ± {final['uncertainty']} N/m. "
        f"The graph of Force against Extension is a straight line passing through "
        f"the origin, confirming that the spring obeys Hooke's Law within the "
        f"elastic limit."
    )


def _moments_conclusion(final: dict, summary: dict) -> str:
    verified = summary.get("principle_verified", False)
    balanced = summary.get("trials_balanced", 0)
    total    = summary.get("total_trials", 0)

    verdict = (
        "The principle of moments is verified as the beam was in equilibrium "
        "in all trials."
        if verified else
        "There were slight imbalances due to measurement error."
    )

    return (
        f"The average percentage difference between the clockwise and "
        f"anticlockwise moments is {final['result_value']}%. "
        f"{verdict} "
        f"{balanced} out of {total} trials showed equilibrium (difference < 5%)."
    )
