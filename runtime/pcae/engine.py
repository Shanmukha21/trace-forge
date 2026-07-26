from typing import Any
from runtime.pcae.ast_parser import parse_static_facts
from runtime.pcae.cfg_builder import build_control_flow_graph
from runtime.pcae.complexity_solver import solve_complexity
from runtime.pcae.explanation_generator import generate_explanation
from runtime.pcae.models import (
    AnalysisResult,
    ControlFlowGraph,
    HumanReadableExplanation,
    RuntimeProfile,
    ScalingProfile,
    StaticFacts,
    SymbolicCostModel,
)
from runtime.pcae.runtime_profiler import profile_runtime_execution
from runtime.pcae.scaling_profiler import run_scaling_profiler
from runtime.pcae.symbolic_cost import build_symbolic_cost_model
from shared.models import ExecutionEvent


class PCAEEngine:
    """Program Cost Analysis Engine (PCAE) Orchestrator.

    Executes 7 independent analysis stages without heuristics or hardcoded
    algorithm names.
    """

    @staticmethod
    def analyze(
        source_code: str,
        stdin_val: str = "",
        runtime_events: list[ExecutionEvent] | None = None,
    ) -> dict[str, Any]:
        """Runs full 7-stage PCAE pipeline and returns unified dictionary payload."""

        # Stage 1: AST Parser
        static_facts: StaticFacts = parse_static_facts(source_code)

        # Stage 2: Control Flow Graph Builder
        cfg: ControlFlowGraph = build_control_flow_graph(
            source_code, static_facts
        )

        # Stage 3: Symbolic Cost Model
        symbolic_cost: SymbolicCostModel = build_symbolic_cost_model(
            cfg, static_facts
        )

        # Stage 4: Runtime Profiler
        if runtime_events is not None and len(runtime_events) > 0:
            runtime_profile: RuntimeProfile = profile_runtime_execution(
                runtime_events
            )
        else:
            from runtime.coordinator import run_program

            events = list(run_program(source_code, stdin_val))
            runtime_profile = profile_runtime_execution(events)

        # Stage 5: Scaling Profiler (Multi-N empirical primitive ops scaling regression)
        scaling_profile: ScalingProfile = run_scaling_profiler(
            source_code, stdin_val
        )

        # Stage 6: Complexity Solver (Multi-evidence fusion)
        analysis_result: AnalysisResult = solve_complexity(
            static_facts, cfg, symbolic_cost, runtime_profile, scaling_profile
        )

        # Stage 7: Explanation Generator
        explanation: HumanReadableExplanation = generate_explanation(
            analysis_result, static_facts, runtime_profile, scaling_profile
        )

        # Paradigm Detection
        from runtime.pcae.paradigm_detector import detect_algorithmic_paradigm

        paradigm_data = detect_algorithmic_paradigm(
            static_facts, cfg, runtime_profile, source_code
        )

        return {
            "time_complexity": analysis_result.time_complexity,
            "space_complexity": analysis_result.space_complexity,
            "dominant_cost": analysis_result.dominant_cost,
            "confidence_score": analysis_result.confidence_score,
            "paradigm": paradigm_data["paradigm"],
            "paradigm_reasoning": paradigm_data["reasoning"],
            "time_reasoning": explanation.time_reasoning,
            "space_reasoning": explanation.space_reasoning,
            "evidence_breakdown": list(explanation.evidence_breakdown),
            "scaling_best_fit": scaling_profile.best_fit_model,
            "scaling_r_squared": scaling_profile.r_squared,
            "total_primitive_ops": runtime_profile.total_primitive_ops,
            "max_nested_loop_depth": static_facts.max_nested_loop_depth,
            "has_recursion": static_facts.has_recursion,
        }
