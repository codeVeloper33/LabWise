"""
Physics calculations for LabWise experiments.

Each "process_*" function takes a student's raw inputs, applies
realistic measurement error (so results aren't perfect like a
calculator), and returns the raw/adjusted/calculated breakdown
that gets stored on a Reading.

Each "finalize_*" function takes all readings for a session and
produces the final result + graph data using linear regression.
"""

import math
import random


# ── Error simulation helpers ───────────────────────────────────

def apply_error(value: float, pct: float) -> float:
    """Apply a random percentage error to a value."""
    return value * (1 + random.uniform(-pct / 100, pct / 100))


def ruler_error(cm: float) -> float:
    """Metre rule reading — ±0.15 cm parallax error."""
    return round(cm + random.uniform(-0.15, 0.15), 1)


def stopwatch_error(seconds: float) -> float:
    """Stopwatch reading — ±0.3 s human reaction time error."""
    return round(seconds + random.uniform(-0.3, 0.3), 2)


def mass_error(g: float) -> float:
    """Mass reading — ±1 g tolerance error."""
    return round(g + random.uniform(-1.0, 1.0), 1)


# ── Simple Pendulum ─────────────────────────────────────────────

def process_pendulum_reading(length_cm, t, oscillations, student_T, student_T2):
    """Process one WAEC pendulum trial.

    WAEC format: one timing t for N oscillations per length.
    The student calculates T = t/N and T² themselves.
    We apply realistic measurement error to length and t,
    then validate the student's T and T² against the correct values.

    Args:
        length_cm   : pendulum length entered by student (cm)
        t           : time for N oscillations from simulation (s)
        oscillations: number of oscillations timed (from config)
        student_T   : T value entered by student (s)
        student_T2  : T² value entered by student (s²)
    """
    adj_length_cm = ruler_error(length_cm)
    adj_t         = stopwatch_error(t)
    adj_length_m  = round(adj_length_cm / 100, 4)

    # Correct values — what the student SHOULD have calculated
    correct_T  = round(adj_t / oscillations, 2)
    correct_T2 = round(correct_T ** 2, 2)
    correct_g  = round((4 * math.pi**2 * adj_length_m) / correct_T**2, 2) if correct_T > 0 else 0

    # Validate student's entries (allow ±2% tolerance for rounding)
    def within_tolerance(student_val, correct_val, pct=2.0):
        if correct_val == 0:
            return abs(student_val) < 0.01
        return abs(student_val - correct_val) / abs(correct_val) * 100 <= pct

    T_correct  = within_tolerance(student_T,  correct_T)
    T2_correct = within_tolerance(student_T2, correct_T2)

    return {
        "raw_inputs": {
            "length_cm":    length_cm,
            "t":            t,
            "oscillations": oscillations,
            "student_T":    student_T,
            "student_T2":   student_T2,
        },
        "adjusted_inputs": {
            "length_cm": adj_length_cm,
            "length_m":  adj_length_m,
            "t":         adj_t,
        },
        "calculated": {
            # Use student's values in the table (what they wrote)
            # but store correct values for graph + finalization
            "T":           student_T,
            "T_squared":   student_T2,
            "correct_T":   correct_T,
            "correct_T2":  correct_T2,
            "g":           correct_g,
            # Validation feedback
            "T_correct":   T_correct,
            "T2_correct":  T2_correct,
        }
    }


def finalize_pendulum(readings: list) -> dict:
    """Compute g from the gradient of T² vs L across all trials.
    Uses correct_T2 (validated values) for graph accuracy."""
    L_vals  = [r["adjusted_inputs"]["length_m"]  for r in readings]
    T2_vals = [r["calculated"]["correct_T2"]      for r in readings]
    g_vals  = [r["calculated"]["g"]               for r in readings]

    reg = linear_regression(L_vals, T2_vals)

    if reg["gradient"] > 0:
        g_final = round((4 * math.pi**2) / reg["gradient"], 4)
    else:
        g_final = round(sum(g_vals) / len(g_vals), 4)

    std_dev = standard_deviation(g_vals)
    pct_err = round(abs(g_final - 9.81) / 9.81 * 100, 2)

    return {
        "result_value": g_final,
        "uncertainty":  std_dev,
        "unit":         "m/s²",
        "graph_data": {
            "x_label":   "Length L (m)",
            "y_label":   "T² (s²)",
            "x_values":  L_vals,
            "y_values":  T2_vals,
            "gradient":  reg["gradient"],
            "intercept": reg["intercept"],
            "r_squared": reg["r_squared"]
        },
        "summary": {
            "g_from_graph":     g_final,
            "percentage_error": pct_err,
            "std_dev":          std_dev
        }
    }


# ── Hooke's Law ──────────────────────────────────────────────────

def process_hookes_reading(mass_g, new_length_cm, natural_length_cm):
    """Process one Hooke's Law trial: mass + new spring length."""
    adj_mass_g  = mass_error(mass_g)
    adj_new_len = ruler_error(new_length_cm)

    mass_kg = round(adj_mass_g / 1000, 5)
    force_n = round(mass_kg * 9.81, 4)

    ext_cm = round(adj_new_len - natural_length_cm, 2)
    ext_m  = round(ext_cm / 100, 5)
    k      = round(force_n / ext_m, 3) if ext_m > 0 else 0

    return {
        "raw_inputs": {
            "mass_g": mass_g, "new_length_cm": new_length_cm
        },
        "adjusted_inputs": {
            "mass_g": adj_mass_g, "mass_kg": mass_kg, "new_length_cm": adj_new_len
        },
        "calculated": {
            "force_N": force_n, "extension_cm": ext_cm, "extension_m": ext_m, "k": k
        }
    }


def finalize_hookes(readings: list) -> dict:
    """Compute spring constant k from the gradient of F vs x."""
    F_vals = [r["calculated"]["force_N"]     for r in readings]
    x_vals = [r["calculated"]["extension_m"] for r in readings]
    k_vals = [r["calculated"]["k"]           for r in readings]

    reg = linear_regression(x_vals, F_vals)
    k_final = round(reg["gradient"], 3)
    std_dev = standard_deviation(k_vals)

    return {
        "result_value": k_final,
        "uncertainty":  std_dev,
        "unit":         "N/m",
        "graph_data": {
            "x_label":   "Extension x (m)",
            "y_label":   "Force F (N)",
            "x_values":  x_vals,
            "y_values":  F_vals,
            "gradient":  reg["gradient"],
            "intercept": reg["intercept"],
            "r_squared": reg["r_squared"]
        },
        "summary": {
            "k_from_graph": k_final,
            "std_dev":      std_dev
        }
    }


# ── Principle of Moments ─────────────────────────────────────────

def process_moments_reading(f1, d1_cm, f2, d2_cm):
    """Process one moments trial: two forces at two distances from the pivot."""
    adj_f1 = round(apply_error(f1, 1.0), 3)
    adj_d1 = round(ruler_error(d1_cm) / 100, 4)
    adj_f2 = round(apply_error(f2, 1.0), 3)
    adj_d2 = round(ruler_error(d2_cm) / 100, 4)

    m1 = round(adj_f1 * adj_d1, 4)
    m2 = round(adj_f2 * adj_d2, 4)

    diff     = round(abs(m1 - m2) / ((m1 + m2) / 2) * 100, 2) if (m1 + m2) > 0 else 0
    balanced = diff < 5.0

    return {
        "raw_inputs": {
            "f1": f1, "d1_cm": d1_cm, "f2": f2, "d2_cm": d2_cm
        },
        "adjusted_inputs": {
            "f1": adj_f1, "d1_m": adj_d1, "d1_cm": round(adj_d1 * 100, 1),
            "f2": adj_f2, "d2_m": adj_d2, "d2_cm": round(adj_d2 * 100, 1)
        },
        "calculated": {
            "moment1_Nm": m1, "moment2_Nm": m2,
            "difference_pct": diff, "balanced": balanced
        }
    }


def finalize_moments(readings: list) -> dict:
    """Summarize moments trials and check the principle holds (M2 ≈ M1)."""
    m1_vals   = [r["calculated"]["moment1_Nm"]     for r in readings]
    m2_vals   = [r["calculated"]["moment2_Nm"]     for r in readings]
    diff_vals = [r["calculated"]["difference_pct"] for r in readings]

    avg_diff = round(sum(diff_vals) / len(diff_vals), 2)
    balanced = sum(1 for r in readings if r["calculated"]["balanced"])

    reg = linear_regression(m1_vals, m2_vals)

    return {
        "result_value": avg_diff,
        "uncertainty":  round(max(diff_vals) - min(diff_vals), 2),
        "unit":         "%",
        "graph_data": {
            "x_label":   "Anticlockwise Moment M₁ (N·m)",
            "y_label":   "Clockwise Moment M₂ (N·m)",
            "x_values":  m1_vals,
            "y_values":  m2_vals,
            "gradient":  reg["gradient"],
            "intercept": reg["intercept"],
            "r_squared": reg["r_squared"]
        },
        "summary": {
            "average_difference_pct": avg_diff,
            "trials_balanced":        balanced,
            "total_trials":           len(readings),
            "principle_verified":     avg_diff < 5.0
        }
    }


# ── Shared math helpers ──────────────────────────────────────────

def linear_regression(x_vals: list, y_vals: list) -> dict:
    """Least-squares linear regression. Returns gradient, intercept, r²."""
    n = len(x_vals)
    if n < 2:
        return {"gradient": 0, "intercept": 0, "r_squared": 0}

    sx  = sum(x_vals)
    sy  = sum(y_vals)
    sxy = sum(x * y for x, y in zip(x_vals, y_vals))
    sx2 = sum(x ** 2 for x in x_vals)

    d = n * sx2 - sx ** 2
    if d == 0:
        return {"gradient": 0, "intercept": 0, "r_squared": 0}

    gradient  = (n * sxy - sx * sy) / d
    intercept = (sy - gradient * sx) / n

    y_mean = sy / n
    ss_tot = sum((y - y_mean) ** 2 for y in y_vals)
    ss_res = sum((y - (gradient * x + intercept)) ** 2 for x, y in zip(x_vals, y_vals))
    r_squared = 1 - ss_res / ss_tot if ss_tot != 0 else 1.0

    return {
        "gradient":  round(gradient,  6),
        "intercept": round(intercept, 6),
        "r_squared": round(r_squared, 4)
    }


def standard_deviation(values: list) -> float:
    """Sample standard deviation (n-1 denominator)."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    var  = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return round(math.sqrt(var), 4)
