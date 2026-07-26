import ast
from typing import Any


class ASTComplexityVisitor(ast.NodeVisitor):
    """Parses arbitrary Python AST to measure structural metrics:

    - Maximum nested loop depth (D)
    - Logarithmic halving operations (// 2, >> 1)
    - Recursive call count & branching factor (R)
    - Auxiliary data structure allocations (Dict, List, Set)
    """

    def __init__(self) -> None:
        self.current_loop_depth = 0
        self.max_loop_depth = 0
        self.has_logarithmic_step = False
        self.has_dict_allocation = False
        self.has_list_allocation = False

        self.current_func_name: str | None = None
        self.recursive_calls_count = 0
        self.recursive_has_halving = False
        self.recursive_has_linear = False

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        prev_func = self.current_func_name
        self.current_func_name = node.name

        # Visit function body
        self.generic_visit(node)

        self.current_func_name = prev_func

    def visit_For(self, node: ast.For) -> None:
        self.current_loop_depth += 1
        if self.current_loop_depth > self.max_loop_depth:
            self.max_loop_depth = self.current_loop_depth

        self.generic_visit(node)
        self.current_loop_depth -= 1

    def visit_While(self, node: ast.While) -> None:
        self.current_loop_depth += 1
        if self.current_loop_depth > self.max_loop_depth:
            self.max_loop_depth = self.current_loop_depth

        self.generic_visit(node)
        self.current_loop_depth -= 1

    def visit_BinOp(self, node: ast.BinOp) -> None:
        # Check for integer division // 2 or right shift >> 1 or / 2
        if isinstance(node.op, (ast.FloorDiv, ast.RShift, ast.Div)):
            if isinstance(node.right, ast.Constant) and node.right.value in (2, 2.0):
                self.has_logarithmic_step = True
                if self.current_func_name:
                    self.recursive_has_halving = True

        self.generic_visit(node)

    def visit_Dict(self, node: ast.Dict) -> None:
        if self.current_func_name:
            self.has_dict_allocation = True
        self.generic_visit(node)

    def visit_Set(self, node: ast.Set) -> None:
        if self.current_func_name:
            self.has_dict_allocation = True
        self.generic_visit(node)

    def visit_List(self, node: ast.List) -> None:
        if self.current_func_name and len(node.elts) == 0:
            # Auxiliary empty list created in function scope
            self.has_list_allocation = True
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        # Check dict() or set() or list() call
        if isinstance(node.func, ast.Name):
            if node.func.id in ("dict", "set"):
                self.has_dict_allocation = True
            elif node.func.id == "list":
                self.has_list_allocation = True

            # Check self-recursive call
            if self.current_func_name and node.func.id == self.current_func_name:
                self.recursive_calls_count += 1
                # Inspect arguments for n-1 or n//2
                for arg in node.args:
                    if isinstance(arg, ast.BinOp):
                        if isinstance(arg.op, ast.Sub):
                            self.recursive_has_linear = True
                        elif isinstance(arg.op, (ast.FloorDiv, ast.Div)):
                            self.recursive_has_halving = True

        self.generic_visit(node)


def analyze_code_structure(code: str) -> dict[str, Any]:
    """Analyzes arbitrary Python code AST and calculates universal structural metrics."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return {
            "max_loop_depth": 0,
            "has_logarithmic_step": False,
            "has_dict_allocation": False,
            "has_list_allocation": False,
            "recursive_calls_count": 0,
            "recursive_has_halving": False,
            "recursive_has_linear": False,
            "estimated_time_complexity": "O(N)",
            "estimated_space_complexity": "O(1)",
        }

    visitor = ASTComplexityVisitor()
    visitor.visit(tree)

    max_depth = visitor.max_loop_depth
    has_log = visitor.has_logarithmic_step
    has_dict = visitor.has_dict_allocation
    has_list = visitor.has_list_allocation
    rec_count = visitor.recursive_calls_count
    rec_halving = visitor.recursive_has_halving
    rec_linear = visitor.recursive_has_linear

    # Universal structural Big-O determination
    if rec_count >= 2 and rec_linear and not rec_halving:
        time_comp = "O(2ᴺ)"
        space_comp = "O(N)"
    elif rec_count >= 2 and (rec_halving or has_list):
        time_comp = "O(N log N)"
        space_comp = "O(N)"
    elif rec_count == 1 and (rec_halving or has_log):
        time_comp = "O(log N)"
        space_comp = "O(log N)"
    elif max_depth >= 3:
        time_comp = f"O(N^{max_depth})"
        space_comp = "O(1)"
    elif max_depth == 2:
        time_comp = "O(N²)"
        space_comp = "O(1)"
    elif max_depth == 1:
        if has_log:
            time_comp = "O(log N)"
            space_comp = "O(1)"
        else:
            time_comp = "O(N)"
            space_comp = "O(N)" if (has_dict or has_list) else "O(1)"
    else:
        # 0 loops
        if has_log:
            time_comp = "O(log N)"
            space_comp = "O(1)"
        else:
            time_comp = "O(1)"
            space_comp = "O(N)" if (has_dict or has_list) else "O(1)"

    return {
        "max_loop_depth": max_depth,
        "has_logarithmic_step": has_log,
        "has_dict_allocation": has_dict,
        "has_list_allocation": has_list,
        "recursive_calls_count": rec_count,
        "recursive_has_halving": rec_halving,
        "recursive_has_linear": rec_linear,
        "estimated_time_complexity": time_comp,
        "estimated_space_complexity": space_comp,
    }
