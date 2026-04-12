import type { KnowledgeGraph } from '@/core/types';

// Remove low-confidence edges and orphan nodes
export function pruneGraph(
  graph: KnowledgeGraph,
  options: {
    minDirectedWeight?: number;
    minUndirectedWeight?: number;
    removeOrphans?: boolean;
  } = {}
): { graph: KnowledgeGraph; prunedEdges: number; prunedNodes: number } {
  const {
    minDirectedWeight = 0.1,
    minUndirectedWeight = 0.15,
    removeOrphans = true,
  } = options;

  let prunedEdges = 0;

  // Prune low-weight directed edges
  for (const [edgeId, edge] of graph.directedEdges) {
    if (edge.weight < minDirectedWeight) {
      graph.directedEdges.delete(edgeId);
      prunedEdges++;
    }
  }

  // Prune low-weight undirected edges
  for (const [edgeId, edge] of graph.undirectedEdges) {
    if (edge.weight < minUndirectedWeight) {
      graph.undirectedEdges.delete(edgeId);
      prunedEdges++;
    }
  }

  // Remove orphan nodes (no edges at all)
  let prunedNodes = 0;
  if (removeOrphans) {
    const connectedNodes = new Set<string>();

    for (const edge of graph.directedEdges.values()) {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    }
    for (const edge of graph.undirectedEdges.values()) {
      connectedNodes.add(edge.nodes[0]);
      connectedNodes.add(edge.nodes[1]);
    }

    for (const nodeId of graph.nodes.keys()) {
      if (!connectedNodes.has(nodeId)) {
        graph.nodes.delete(nodeId);
        prunedNodes++;
      }
    }
  }

  // Update metadata
  graph.metadata.nodeCount = graph.nodes.size;
  graph.metadata.directedEdgeCount = graph.directedEdges.size;
  graph.metadata.undirectedEdgeCount = graph.undirectedEdges.size;
  graph.metadata.updatedAt = Date.now();

  return { graph, prunedEdges, prunedNodes };
}
