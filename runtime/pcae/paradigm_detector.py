import re
from runtime.pcae.models import ControlFlowGraph, RuntimeProfile, StaticFacts


def detect_algorithmic_paradigm(
    static_facts: StaticFacts,
    cfg: ControlFlowGraph,
    runtime_profile: RuntimeProfile,
    source_code: str,
) -> dict[str, str]:
    """Infers algorithmic paradigm without hardcoded function names."""
    # 1. Backtracking / State Space Tree Search
    if static_facts.has_recursive_loop:
        return {
            "paradigm": "Backtracking / State Space Tree Search",
            "reasoning": "Loop body executes self-recursive calls, constructing a combinatorial decision tree.",
        }

    # Count recursive call occurrences in source code
    recursive_calls_count = (
        len(re.findall(r"\b[a-zA-Z_]\w*\s*\([^)]*\)", source_code))
        if static_facts.has_recursion
        else 0
    )
    if static_facts.has_recursion and (
        static_facts.max_nested_loop_depth >= 1
        or runtime_profile.max_recursive_depth >= 3
    ):
        if re.search(
            r"append\(|pop\(|remove\(|add\(|insert\(", source_code
        ) or re.search(r"start\s*\+\s*1|index\s*\+\s*1", source_code):
            return {
                "paradigm": "Backtracking / State Space Tree Search",
                "reasoning": "Recursive choices with state mutations (append/pop/backtrack) expanding decision state tree.",
            }

    # 2. Sliding Window
    if re.search(r"while.*in\s+|while\s+[a-zA-Z_]\w*\s*<", source_code) and (
        re.search(r"\bl\s*\+=\s*1|\bleft\s*\+=\s*1", source_code)
        or re.search(r"remove\(", source_code)
    ):
        return {
            "paradigm": "Sliding Window",
            "reasoning": "Dynamically expanding/shrinking window range [left...right] over linear sequence.",
        }

    # 3. Two Pointers / Binary Search
    if re.search(
        r"low\s*<=\s*high|left\s*<\s*right|i\s*<\s*j|low\s*<\s*high", source_code
    ):
        if re.search(r"//\s*2|>>\s*1", source_code):
            return {
                "paradigm": "Divide & Conquer / Binary Search",
                "reasoning": "Converging pointer bounds with binary midpoint halving (// 2).",
            }
        return {
            "paradigm": "Two Pointers",
            "reasoning": "Two converging pointer indices traversing inward from sequence boundaries.",
        }

    # 4. Divide and Conquer
    if static_facts.has_recursion and re.search(
        r"//\s*2|len\([^)]*\)\s*//\s*2|:\s*mid|mid\s*:", source_code
    ):
        return {
            "paradigm": "Divide & Conquer",
            "reasoning": "Binary subproblem partitioning into independent sub-trees.",
        }

    # 5. Fallback Iterative / Linear Traversal
    if static_facts.max_nested_loop_depth >= 2:
        return {
            "paradigm": "Polynomial Iterative Search",
            "reasoning": "Multi-nested loop iteration over sequence indices.",
        }

    if static_facts.max_nested_loop_depth == 1:
        return {
            "paradigm": "Linear Traversal",
            "reasoning": "Single pass iteration over input elements.",
        }

    return {
        "paradigm": "Constant Execution",
        "reasoning": "Direct conditional execution.",
    }
