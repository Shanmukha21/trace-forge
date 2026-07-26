import ast
import copy


class TraceInstrumenter(ast.NodeTransformer):
    """AST NodeTransformer that instruments Python code to trace assignments

    and comparisons for visualization.
    """

    def _get_target_name(self, target: ast.AST) -> str:
        """Helper to recursively generate a string representation of
        assignment targets.
        """
        if isinstance(target, ast.Name):
            return target.id
        elif isinstance(target, ast.Subscript):
            val_name = self._get_target_name(target.value)
            slice_str = "..."
            if isinstance(target.slice, ast.Name):
                slice_str = target.slice.id
            elif isinstance(target.slice, ast.Constant):
                slice_str = str(target.slice.value)
            elif isinstance(target.slice, ast.BinOp):
                slice_str = "expr"
            return f"{val_name}[{slice_str}]"
        elif isinstance(target, (ast.Tuple, ast.List)):
            names = [self._get_target_name(elt) for elt in target.elts]
            return f"({', '.join(filter(None, names))})"
        return ""

    def _to_load_ctx(self, target: ast.AST) -> ast.AST | None:
        """Clones an assignment target node and changes its context to Load

        so it can be evaluated as an expression.
        """
        node_copy = copy.deepcopy(target)
        if isinstance(node_copy, ast.Name):
            node_copy.ctx = ast.Load()
            return node_copy
        elif isinstance(node_copy, ast.Subscript):
            node_copy.ctx = ast.Load()
            return node_copy
        elif isinstance(node_copy, (ast.Tuple, ast.List)):
            elts_loaded = []
            for elt in node_copy.elts:
                elt_loaded = self._to_load_ctx(elt)
                if elt_loaded is None:
                    return None
                elts_loaded.append(elt_loaded)
            node_copy.elts = elts_loaded
            if isinstance(node_copy, ast.Tuple):
                node_copy.ctx = ast.Load()
            else:
                node_copy.ctx = ast.Load()
            return node_copy
        return None

    def visit_Compare(self, node: ast.Compare) -> ast.AST:
        """Instruments comparisons like `a < b` to call
        `__tf_compare__(left, op, right, line)`.
        """
        self.generic_visit(node)

        # We only instrument simple binary comparisons
        if len(node.ops) == 1:
            left = node.left
            op = node.ops[0]
            right = node.comparators[0]

            op_map = {
                ast.Lt: "Lt",
                ast.LtE: "LtE",
                ast.Gt: "Gt",
                ast.GtE: "GtE",
                ast.Eq: "Eq",
                ast.NotEq: "NotEq",
                ast.In: "In",
                ast.NotIn: "NotIn",
                ast.Is: "Is",
                ast.IsNot: "IsNot",
            }
            op_str = op_map.get(type(op), type(op).__name__)

            # Replace comparison node with __tf_compare__(left, op_str, right, lineno)
            return ast.Call(
                func=ast.Name(id="__tf_compare__", ctx=ast.Load()),
                args=[
                    left,
                    ast.Constant(value=op_str),
                    right,
                    ast.Constant(value=node.lineno),
                ],
                keywords=[],
            )
        return node

    def visit_Assign(self, node: ast.Assign) -> ast.Assign | list[ast.AST]:
        """Instruments variable and array assignments to trigger
        `__tf_assign__(name, value, line)`.
        """
        self.generic_visit(node)

        trace_calls = []
        for target in node.targets:
            target_str = self._get_target_name(target)
            if target_str:
                load_target = self._to_load_ctx(target)
                if load_target is not None:
                    # Construct trace helper call:
                    # __tf_assign__("x", x, line_number)
                    trace_call = ast.Expr(
                        value=ast.Call(
                            func=ast.Name(id="__tf_assign__", ctx=ast.Load()),
                            args=[
                                ast.Constant(value=target_str),
                                load_target,
                                ast.Constant(value=node.lineno),
                            ],
                            keywords=[],
                        )
                    )
                    trace_calls.append(trace_call)

        if trace_calls:
            # Insert the trace call(s) immediately after the assignment
            return [node] + trace_calls
        return node

    def visit_For(self, node: ast.For) -> ast.For:
        """Injects `__tf_loop__("LOOP_ENTER", line)` at the start of loop bodies."""
        self.generic_visit(node)

        loop_enter_call = ast.Expr(
            value=ast.Call(
                func=ast.Name(id="__tf_loop__", ctx=ast.Load()),
                args=[
                    ast.Constant(value="LOOP_ENTER"),
                    ast.Constant(value=node.lineno),
                ],
                keywords=[],
            )
        )
        node.body.insert(0, loop_enter_call)
        return node

    def visit_While(self, node: ast.While) -> ast.While:
        """Injects `__tf_loop__("LOOP_ENTER", line)` at the start of loop bodies."""
        self.generic_visit(node)

        loop_enter_call = ast.Expr(
            value=ast.Call(
                func=ast.Name(id="__tf_loop__", ctx=ast.Load()),
                args=[
                    ast.Constant(value="LOOP_ENTER"),
                    ast.Constant(value=node.lineno),
                ],
                keywords=[],
            )
        )
        node.body.insert(0, loop_enter_call)
        return node


def instrument_code(source_code: str) -> str:
    """Parses source code into AST, runs the TraceInstrumenter,
    and compiles it back to source.
    """
    tree = ast.parse(source_code)
    transformer = TraceInstrumenter()
    instrumented_tree = transformer.visit(tree)
    ast.fix_missing_locations(instrumented_tree)
    return ast.unparse(instrumented_tree)
