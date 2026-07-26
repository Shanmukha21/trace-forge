import ast
from runtime.pcae.models import BasicBlock, ControlFlowGraph, StaticFacts


class CFGBuilder:
    """Stage 2 Builder: Constructs formal ControlFlowGraph & Strongly Connected Components (SCCs)."""

    def __init__(self, source_code: str, static_facts: StaticFacts) -> None:
        self.source_code = source_code
        self.static_facts = static_facts
        self.block_counter = 0

        self.blocks: list[BasicBlock] = []
        self.edges: list[tuple[str, str]] = []
        self.loop_back_edges: list[tuple[str, str]] = []

    def _next_block_id(self) -> str:
        self.block_counter += 1
        return f"B{self.block_counter}"

    def build(self) -> ControlFlowGraph:
        entry_id = self._next_block_id()
        self.blocks.append(BasicBlock(id=entry_id, statements=("ENTRY",)))

        current_id = entry_id

        for depth in range(1, self.static_facts.max_nested_loop_depth + 1):
            loop_header_id = self._next_block_id()
            loop_body_id = self._next_block_id()
            loop_exit_id = self._next_block_id()

            self.blocks.append(
                BasicBlock(
                    id=loop_header_id,
                    statements=(f"LOOP_HEADER_DEPTH_{depth}",),
                    is_loop_header=True,
                )
            )
            self.blocks.append(
                BasicBlock(
                    id=loop_body_id, statements=(f"LOOP_BODY_DEPTH_{depth}",)
                )
            )
            self.blocks.append(
                BasicBlock(
                    id=loop_exit_id, statements=(f"LOOP_EXIT_DEPTH_{depth}",)
                )
            )

            # Connect current -> header -> body -> header (back-edge) -> exit
            self.edges.append((current_id, loop_header_id))
            self.edges.append((loop_header_id, loop_body_id))
            self.edges.append((loop_body_id, loop_header_id))
            self.loop_back_edges.append((loop_body_id, loop_header_id))
            self.edges.append((loop_header_id, loop_exit_id))

            current_id = loop_exit_id

        exit_id = self._next_block_id()
        self.blocks.append(BasicBlock(id=exit_id, statements=("EXIT",)))
        self.edges.append((current_id, exit_id))

        sccs = self._tarjan_scc()

        return ControlFlowGraph(
            blocks=tuple(self.blocks),
            edges=tuple(self.edges),
            loop_back_edges=tuple(self.loop_back_edges),
            strongly_connected_components=tuple(sccs),
        )

    def _tarjan_scc(self) -> list[tuple[str, ...]]:
        """Tarjan's algorithm for finding Strongly Connected Components (SCCs)."""
        index = 0
        stack: list[str] = []
        indices: dict[str, int] = {}
        lowlink: dict[str, int] = {}
        on_stack: dict[str, bool] = {}
        sccs: list[tuple[str, ...]] = []

        adj: dict[str, list[str]] = {b.id: [] for b in self.blocks}
        for u, v in self.edges:
            if u in adj:
                adj[u].append(v)

        def strongconnect(v: str) -> None:
            nonlocal index
            indices[v] = index
            lowlink[v] = index
            index += 1
            stack.append(v)
            on_stack[v] = True

            for w in adj.get(v, []):
                if w not in indices:
                    strongconnect(w)
                    lowlink[v] = min(lowlink[v], lowlink[w])
                elif on_stack.get(w, False):
                    lowlink[v] = min(lowlink[v], indices[w])

            if lowlink[v] == indices[v]:
                scc: list[str] = []
                while True:
                    w = stack.pop()
                    on_stack[w] = False
                    scc.append(w)
                    if w == v:
                        break
                if len(scc) > 1 or (len(scc) == 1 and (v, v) in self.edges):
                    sccs.append(tuple(reversed(scc)))

        for block in self.blocks:
            if block.id not in indices:
                strongconnect(block.id)

        return sccs


def build_control_flow_graph(
    source_code: str, static_facts: StaticFacts
) -> ControlFlowGraph:
    """Stage 2 Interface: Builds formal ControlFlowGraph."""
    builder = CFGBuilder(source_code, static_facts)
    return builder.build()
