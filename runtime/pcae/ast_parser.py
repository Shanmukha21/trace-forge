import ast
from runtime.pcae.models import StaticFacts


class PCAEASTVisitor(ast.NodeVisitor):
    """Stage 1 Parser: Extracts structural facts without making complexity inferences."""

    def __init__(self) -> None:
        self.functions: list[str] = []
        self.loop_count: int = 0
        self.current_depth: int = 0
        self.max_nested_loop_depth: int = 0
        self.has_recursion: bool = False
        self.has_recursive_loop: bool = False
        self.function_calls: list[str] = []
        self.allocations: list[str] = []
        self.comprehensions_count: int = 0
        self.conditional_branches_count: int = 0

        self._current_func: str | None = None

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self.functions.append(node.name)
        prev_func = self._current_func
        self._current_func = node.name

        self.generic_visit(node)
        self._current_func = prev_func

    def visit_For(self, node: ast.For) -> None:
        self.loop_count += 1
        self.current_depth += 1
        if self.current_depth > self.max_nested_loop_depth:
            self.max_nested_loop_depth = self.current_depth

        self.generic_visit(node)
        self.current_depth -= 1

    def visit_While(self, node: ast.While) -> None:
        self.loop_count += 1
        self.current_depth += 1
        if self.current_depth > self.max_nested_loop_depth:
            self.max_nested_loop_depth = self.current_depth

        self.generic_visit(node)
        self.current_depth -= 1

    def visit_If(self, node: ast.If) -> None:
        self.conditional_branches_count += 1
        self.generic_visit(node)

    def visit_ListComp(self, node: ast.ListComp) -> None:
        self.comprehensions_count += 1
        self.generic_visit(node)

    def visit_DictComp(self, node: ast.DictComp) -> None:
        self.comprehensions_count += 1
        self.generic_visit(node)

    def visit_SetComp(self, node: ast.SetComp) -> None:
        self.comprehensions_count += 1
        self.generic_visit(node)

    def visit_Dict(self, node: ast.Dict) -> None:
        self.allocations.append("dict")
        self.generic_visit(node)

    def visit_Set(self, node: ast.Set) -> None:
        self.allocations.append("set")
        self.generic_visit(node)

    def visit_List(self, node: ast.List) -> None:
        self.allocations.append("list")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            self.function_calls.append(func_name)

            if func_name in ("dict", "set", "list"):
                self.allocations.append(func_name)

            if self._current_func and func_name == self._current_func:
                self.has_recursion = True
                if self.current_depth > 0:
                    self.has_recursive_loop = True

        self.generic_visit(node)


def parse_static_facts(source_code: str) -> StaticFacts:
    """Stage 1 Interface: Parses source code into StaticFacts."""
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        return StaticFacts()

    visitor = PCAEASTVisitor()
    visitor.visit(tree)

    return StaticFacts(
        functions=tuple(visitor.functions),
        loop_count=visitor.loop_count,
        max_nested_loop_depth=visitor.max_nested_loop_depth,
        has_recursion=visitor.has_recursion,
        has_recursive_loop=visitor.has_recursive_loop,
        function_calls=tuple(visitor.function_calls),
        allocations=tuple(visitor.allocations),
        comprehensions_count=visitor.comprehensions_count,
        conditional_branches_count=visitor.conditional_branches_count,
    )
