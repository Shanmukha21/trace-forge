from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class StaticFacts:
    """Stage 1 Output: Structural facts extracted from AST."""

    functions: tuple[str, ...] = ()
    loop_count: int = 0
    max_nested_loop_depth: int = 0
    has_recursion: bool = False
    function_calls: tuple[str, ...] = ()
    allocations: tuple[str, ...] = ()  # e.g. ("dict", "list", "set")
    comprehensions_count: int = 0
    conditional_branches_count: int = 0


@dataclass(frozen=True)
class BasicBlock:
    """Represents a basic block in a Control Flow Graph."""

    id: str
    statements: tuple[str, ...] = ()
    is_loop_header: bool = False


@dataclass(frozen=True)
class ControlFlowGraph:
    """Stage 2 Output: Formal Control Flow Graph."""

    blocks: tuple[BasicBlock, ...] = ()
    edges: tuple[tuple[str, str], ...] = ()  # (src_id, dst_id)
    loop_back_edges: tuple[tuple[str, str], ...] = ()
    strongly_connected_components: tuple[tuple[str, ...], ...] = ()


@dataclass(frozen=True)
class SymbolicCostModel:
    """Stage 3 Output: Unsimplified symbolic cost expressions."""

    expression: str
    symbolic_terms: tuple[str, ...] = ()


@dataclass(frozen=True)
class RuntimeProfile:
    """Stage 4 Output: Primitive operation counts from a single trace run."""

    comparisons: int = 0
    assignments: int = 0
    reads: int = 0
    writes: int = 0
    allocations: int = 0
    loop_iterations: int = 0
    function_calls: int = 0
    max_recursive_depth: int = 1
    dict_ops: int = 0
    set_ops: int = 0
    list_ops: int = 0

    @property
    def total_primitive_ops(self) -> int:
        return (
            self.comparisons
            + self.assignments
            + self.reads
            + self.writes
            + self.allocations
            + self.loop_iterations
            + self.function_calls
            + self.dict_ops
            + self.set_ops
            + self.list_ops
        )


@dataclass(frozen=True)
class ScalingMeasurement:
    """Single empirical measurement point at size N."""

    input_size_n: int
    primitive_ops_count: int


@dataclass(frozen=True)
class ScalingProfile:
    """Stage 5 Output: Multi-N primitive operation scaling regression."""

    measurements: tuple[ScalingMeasurement, ...] = ()
    best_fit_model: str = "O(1)"  # Candidate Big-O model
    r_squared: float = 1.0  # Coefficient of determination (0.0 to 1.0)
    candidate_scores: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class AnalysisResult:
    """Stage 6 Output: Fused complexity analysis result."""

    time_complexity: str  # e.g. "O(N log N)"
    space_complexity: str  # e.g. "O(N)"
    dominant_cost: str  # e.g. "ArrayComparisons"
    confidence_score: float  # Percentage: 0.0 to 100.0


@dataclass(frozen=True)
class HumanReadableExplanation:
    """Stage 7 Output: Plain-English structured evidence explanation."""

    time_reasoning: str
    space_reasoning: str
    evidence_breakdown: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "time_reasoning": self.time_reasoning,
            "space_reasoning": self.space_reasoning,
            "evidence_breakdown": list(self.evidence_breakdown),
        }
