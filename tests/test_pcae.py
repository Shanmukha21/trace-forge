from runtime.pcae.ast_parser import parse_static_facts
from runtime.pcae.cfg_builder import build_control_flow_graph
from runtime.pcae.complexity_solver import solve_complexity
from runtime.pcae.engine import PCAEEngine
from runtime.pcae.explanation_generator import generate_explanation
from runtime.pcae.runtime_profiler import profile_runtime_execution
from runtime.pcae.scaling_profiler import run_scaling_profiler
from runtime.pcae.symbolic_cost import build_symbolic_cost_model


def test_stage1_ast_parser() -> None:
    code = """
def process(arr):
    res = {}
    for i in range(len(arr)):
        for j in range(len(arr)):
            res[i] = arr[j]
    return res
"""
    facts = parse_static_facts(code)
    assert "process" in facts.functions
    assert facts.loop_count == 2
    assert facts.max_nested_loop_depth == 2
    assert "dict" in facts.allocations


def test_stage2_cfg_builder() -> None:
    code = "for i in range(5):\n    print(i)"
    facts = parse_static_facts(code)
    cfg = build_control_flow_graph(code, facts)
    assert len(cfg.blocks) > 0
    assert len(cfg.edges) > 0
    assert len(cfg.loop_back_edges) == 1


def test_stage3_symbolic_cost() -> None:
    code = "for i in range(5):\n    for j in range(5):\n        d = {}"
    facts = parse_static_facts(code)
    cfg = build_control_flow_graph(code, facts)
    model = build_symbolic_cost_model(cfg, facts)
    assert "Loop(N^2)" in model.expression
    assert "HashLookup()" in model.expression


def test_stage4_runtime_profiler() -> None:
    from runtime.coordinator import run_program

    code = "numbers = [64, 34, 25]\nfor i in range(len(numbers)):\n    x = numbers[i]"
    events = list(run_program(code))
    profile = profile_runtime_execution(events)
    assert profile.loop_iterations > 0
    assert profile.total_primitive_ops > 0


def test_stage5_scaling_profiler() -> None:
    code = "numbers = [1, 2, 3]\nfor i in range(len(numbers)):\n    for j in range(len(numbers)):\n        x = numbers[i] + numbers[j]"
    profile = run_scaling_profiler(code)
    assert profile.best_fit_model == "O(N²)"
    assert profile.r_squared >= 0.90


def test_pcae_engine_end_to_end() -> None:
    code = """
def twoSum(nums, target):
    hm = {}
    for i in range(len(nums)):
        if target - nums[i] in hm:
            return [hm[target - nums[i]], i]
        hm[nums[i]] = i
    return []

numbers = [2, 7, 11, 15]
twoSum(numbers, 9)
"""
    res = PCAEEngine.analyze(code)
    assert res["time_complexity"] == "O(N)"
    assert res["space_complexity"] == "O(N)"
    assert res["confidence_score"] >= 80.0
    assert "time_reasoning" in res
    assert len(res["evidence_breakdown"]) == 4


if __name__ == "__main__":
    test_stage1_ast_parser()
    test_stage2_cfg_builder()
    test_stage3_symbolic_cost()
    test_stage4_runtime_profiler()
    test_stage5_scaling_profiler()
    test_pcae_engine_end_to_end()
    print("All 7 PCAE pipeline stage unit tests passed successfully!")
