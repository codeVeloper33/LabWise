"""
Generates WAEC-style practical questions based on the experiment
chosen and the parameters the student entered on the
Create Experiment page. The returned question stays visible
throughout the lab session.
"""


def generate_pendulum_question(config: dict) -> dict:
    num_trials   = config.get("num_trials", 5)
    oscillations = config.get("oscillations", 20)

    question_text = (
        f"A simple pendulum experiment was set up in the laboratory. "
        f"A pendulum bob was suspended from a fixed point using an inextensible string. "
        f"The length of the pendulum was varied for {num_trials} different values. "
        f"For each length, the time for {oscillations} complete oscillations was recorded "
        f"three times and the average taken to reduce the effect of human reaction time error.\n\n"
        f"(a) Record your readings in a suitable table, including the length L, "
        f"the three timing readings t₁, t₂, t₃, the average time t, "
        f"the period T = t/{oscillations}, and T².\n\n"
        f"(b) Plot a graph of T² (y-axis) against L (x-axis).\n\n"
        f"(c) Determine the gradient of your graph and hence calculate the value of "
        f"the acceleration due to gravity g using the formula g = 4π²/gradient.\n\n"
        f"(d) State TWO precautions you took to obtain accurate results.\n\n"
        f"(e) State TWO sources of error in this experiment."
    )

    return {
        "experiment": "pendulum",
        "title":      "Simple Pendulum — Determination of g",
        "text":       question_text,
        "formula":    "g = 4π²L / T²",
        "graph_instruction": "Plot T² against L. Gradient = 4π²/g",
        "parameters": config
    }


def generate_hookes_question(config: dict) -> dict:
    natural_len = config.get("natural_length_cm", 10)
    masses      = config.get("masses_g", [100, 200, 300, 400, 500])
    mass_str    = ", ".join(f"{m}g" for m in masses)

    question_text = (
        f"A helical spring was suspended vertically from a clamp stand. "
        f"Its natural length was measured as {natural_len} cm (no load attached). "
        f"Masses of {mass_str} were added one at a time to the spring. "
        f"For each mass, the new length of the spring was recorded after it had "
        f"stopped oscillating.\n\n"
        f"(a) Record your readings in a suitable table, including the mass m (g and kg), "
        f"the applied force F = mg, the new length, the extension x, and x in metres.\n\n"
        f"(b) Plot a graph of Force F (y-axis) against Extension x (x-axis).\n\n"
        f"(c) Determine the gradient of your graph. State what the gradient represents.\n\n"
        f"(d) Hence determine the spring constant k and state its unit.\n\n"
        f"(e) State TWO precautions taken during this experiment.\n\n"
        f"(f) At what point would the spring no longer obey Hooke's Law?"
    )

    return {
        "experiment": "hookes",
        "title":      "Hooke's Law — Determination of Spring Constant",
        "text":       question_text,
        "formula":    "k = F / x",
        "graph_instruction": "Plot F against x. Gradient = k (spring constant)",
        "parameters": config
    }


def generate_moments_question(config: dict) -> dict:
    pivot      = config.get("pivot_cm", 50)
    num_trials = config.get("num_trials", 5)

    question_text = (
        f"A uniform metre rule was balanced horizontally on a knife-edge pivot at "
        f"the {pivot} cm mark. Known weights were hung on both sides of the pivot. "
        f"For each of {num_trials} trials, different forces F₁ and F₂ were placed at "
        f"distances d₁ and d₂ from the pivot respectively, and the rule was adjusted "
        f"until it balanced horizontally.\n\n"
        f"(a) Record your readings in a suitable table, including F₁, d₁, M₁ = F₁×d₁, "
        f"F₂, d₂, M₂ = F₂×d₂, and the percentage difference between M₁ and M₂.\n\n"
        f"(b) Plot a graph of M₂ (y-axis) against M₁ (x-axis).\n\n"
        f"(c) Determine the gradient of your graph and comment on its value.\n\n"
        f"(d) State the Principle of Moments and comment on whether your results verify it.\n\n"
        f"(e) State TWO precautions taken during this experiment."
    )

    return {
        "experiment": "moments",
        "title":      "Principle of Moments — Verification",
        "text":       question_text,
        "formula":    "F₁ × d₁ = F₂ × d₂",
        "graph_instruction": "Plot M₂ against M₁. Gradient should be ≈ 1.0",
        "parameters": config
    }


def generate_question(experiment_name: str, config: dict) -> dict:
    """Dispatch to the correct question generator for the experiment."""
    generators = {
        "pendulum": generate_pendulum_question,
        "hookes":   generate_hookes_question,
        "moments":  generate_moments_question,
    }
    generator = generators.get(experiment_name)
    if not generator:
        return {}
    return generator(config)
