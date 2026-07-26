import math
import re
from runtime.pcae.models import ScalingMeasurement, ScalingProfile
from runtime.pcae.runtime_profiler import profile_runtime_execution


def synthesize_code_for_n(source_code: str, target_n: int) -> str:
    """Synthesizes code with modified input size target_n across strings, lists, and scalars."""
    synthesized_arr = list(range(1, target_n + 1))
    arr_str = str(synthesized_arr)

    pattern = "abcdefghijklmnopqrstuvwxyz"
    synth_str = "".join(pattern[i % len(pattern)] for i in range(target_n))

    new_code = source_code

    new_code = re.sub(
        r'(\b[a-zA-Z_]\w*\s*=\s*)("[^"]*"|\'[^\']*\')',
        rf'\1"{synth_str}"',
        new_code,
    )

    new_code = re.sub(
        r"(\b[a-zA-Z_]\w*\s*=\s*)\[[^\]]*\]", rf"\1{arr_str}", new_code
    )

    new_code = re.sub(r"(\bn\s*=\s*)\d+", rf"\1{target_n}", new_code)

    return new_code


def fit_growth_model(
    measurements: list[ScalingMeasurement],
) -> tuple[str, float, dict[str, float]]:
    """Fits measured primitive operation counts T(N) against candidate growth models.

    Uses Coefficient of Determination (R² score).
    """
    if not measurements or len(measurements) < 2:
        return ("O(1)", 1.0, {"O(1)": 1.0})

    valid_points = [m for m in measurements if m.primitive_ops_count > 0]
    if len(valid_points) < 2:
        return ("O(1)", 1.0, {"O(1)": 1.0})

    n_vec = [m.input_size_n for m in valid_points]
    t_vec = [float(m.primitive_ops_count) for m in valid_points]

    mean_t = sum(t_vec) / len(t_vec)
    ss_tot = sum((t - mean_t) ** 2 for t in t_vec)
    if ss_tot == 0:
        return ("O(1)", 1.0, {"O(1)": 1.0})

    candidate_funcs = {
        "O(1)": lambda n: 1.0,
        "O(log N)": lambda n: math.log2(max(2, n)),
        "O(N)": lambda n: float(n),
        "O(N log N)": lambda n: float(n) * math.log2(max(2, n)),
        "O(N²)": lambda n: float(n) ** 2,
        "O(N³)": lambda n: float(n) ** 3,
        "O(2^N)": lambda n: 2.0 ** min(n, 20),
    }

    scores: dict[str, float] = {}
    best_model = "O(N)"
    best_r2 = -float("inf")

    for model_name, func in candidate_funcs.items():
        g_vec = [func(n) for n in n_vec]

        sum_gg = sum(g * g for g in g_vec)
        if sum_gg == 0:
            c = 0.0
        else:
            c = sum(t * g for t, g in zip(t_vec, g_vec, strict=False)) / sum_gg

        c = max(0.0, c)

        ss_res = sum(
            (t - c * g) ** 2 for t, g in zip(t_vec, g_vec, strict=False)
        )
        r2 = max(0.0, 1.0 - (ss_res / ss_tot))

        scores[model_name] = round(r2, 4)
        if r2 > best_r2:
            best_r2 = r2
            best_model = model_name

    return (best_model, round(max(0.0, best_r2), 4), scores)


def run_scaling_profiler(
    source_code: str, stdin_val: str = ""
) -> ScalingProfile:
    """Stage 5 Interface: Measures primitive operations across safe N=[2, 3, 4, 5]."""
    from runtime.coordinator import run_program

    target_n_list = [2, 3, 4, 5]
    measurements: list[ScalingMeasurement] = []

    for target_n in target_n_list:
        try:
            synth_code = synthesize_code_for_n(source_code, target_n)

            # Cap sub-run events at 1000 to prevent combinatorial memory/CPU explosion
            sub_events = []
            for evt in run_program(synth_code, stdin_val, skip_pcae=True):
                sub_events.append(evt)
                if len(sub_events) >= 1000:
                    break

            profile = profile_runtime_execution(sub_events)
            ops = profile.total_primitive_ops

            if ops > 0:
                measurements.append(
                    ScalingMeasurement(
                        input_size_n=target_n, primitive_ops_count=ops
                    )
                )
        except Exception:
            continue

    best_model, r2, candidate_scores = fit_growth_model(measurements)

    return ScalingProfile(
        measurements=tuple(measurements),
        best_fit_model=best_model,
        r_squared=r2,
        candidate_scores=candidate_scores,
    )
