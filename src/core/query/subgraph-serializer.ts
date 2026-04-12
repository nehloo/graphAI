import type { GraphNode, DirectedEdge, UndirectedEdge, NodeId, SubgraphContext } from '@/core/types';

// Serialize a subgraph into a token-efficient format for LLM prompts
// This is the key differentiator vs flat RAG chunks

export function serializeSubgraph(
  nodes: GraphNode[],
  directedEdges: DirectedEdge[],
  undirectedEdges: UndirectedEdge[],
  scores: Map<NodeId, number>
): SubgraphContext {
  const lines: string[] = [];

  lines.push(`=== KNOWLEDGE SUBGRAPH (${nodes.length} nodes, ${directedEdges.length + undirectedEdges.length} edges) ===`);
  lines.push('');

  // Nodes section — sorted by relevance score
  const sortedNodes = [...nodes].sort((a, b) => {
    const scoreA = scores.get(a.id) || 0;
    const scoreB = scores.get(b.id) || 0;
    return scoreB - scoreA;
  });

  // Build short ID mapping for readability
  const shortIds = new Map<NodeId, string>();
  sortedNodes.forEach((node, i) => {
    shortIds.set(node.id, `n${i + 1}`);
  });

  lines.push('--- NODES ---');
  for (const node of sortedNodes) {
    // Skip structural nodes (document/section headers) — include their content inline
    if (node.type === 'document' || node.type === 'section') continue;

    const shortId = shortIds.get(node.id)!;
    const score = (scores.get(node.id) || 0).toFixed(2);
    const source = node.source.section ? `src:${node.source.section}` : '';
    lines.push(`[${shortId}|${node.type}|${score}${source ? '|' + source : ''}] ${node.content}`);
  }

  // Directed edges
  if (directedEdges.length > 0) {
    lines.push('');
    lines.push('--- DIRECTED ---');
    for (const edge of directedEdges) {
      const from = shortIds.get(edge.from);
      const to = shortIds.get(edge.to);
      if (from && to) {
        lines.push(`${from} -[${edge.type}:${edge.weight.toFixed(1)}]-> ${to}`);
      }
    }
  }

  // Undirected edges
  if (undirectedEdges.length > 0) {
    lines.push('');
    lines.push('--- UNDIRECTED ---');
    for (const edge of undirectedEdges) {
      const a = shortIds.get(edge.nodes[0]);
      const b = shortIds.get(edge.nodes[1]);
      if (a && b) {
        lines.push(`${a} ~[${edge.type}:${edge.weight.toFixed(1)}]~ ${b}`);
      }
    }
  }

  const serialized = lines.join('\n');

  return {
    nodes,
    directedEdges,
    undirectedEdges,
    serialized,
  };
}
