import type { KnowledgeGraph, NodeId } from '@/core/types';
import { DEDUP_THRESHOLD } from '@/core/constants';

// Merge nodes with identical content hashes or very high similarity
export function deduplicateGraph(graph: KnowledgeGraph): {
  graph: KnowledgeGraph;
  mergedCount: number;
} {
  const hashToNodes = new Map<string, NodeId[]>();

  // Group by content hash
  for (const [nodeId, node] of graph.nodes) {
    const list = hashToNodes.get(node.contentHash) || [];
    list.push(nodeId);
    hashToNodes.set(node.contentHash, list);
  }

  // Build merge map: duplicate → canonical
  const mergeMap = new Map<NodeId, NodeId>();
  let mergedCount = 0;

  for (const nodeIds of hashToNodes.values()) {
    if (nodeIds.length <= 1) continue;

    // Keep the first node as canonical, merge the rest
    const canonical = nodeIds[0];
    for (let i = 1; i < nodeIds.length; i++) {
      mergeMap.set(nodeIds[i], canonical);
      mergedCount++;
    }
  }

  if (mergedCount === 0) return { graph, mergedCount: 0 };

  // Remove merged nodes
  for (const duplicateId of mergeMap.keys()) {
    graph.nodes.delete(duplicateId);
  }

  // Update directed edges: remap node references
  for (const [edgeId, edge] of graph.directedEdges) {
    const newFrom = mergeMap.get(edge.from) || edge.from;
    const newTo = mergeMap.get(edge.to) || edge.to;

    if (newFrom === newTo) {
      // Self-loop after merge — remove
      graph.directedEdges.delete(edgeId);
    } else if (newFrom !== edge.from || newTo !== edge.to) {
      graph.directedEdges.set(edgeId, { ...edge, from: newFrom, to: newTo });
    }
  }

  // Update undirected edges
  for (const [edgeId, edge] of graph.undirectedEdges) {
    const newA = mergeMap.get(edge.nodes[0]) || edge.nodes[0];
    const newB = mergeMap.get(edge.nodes[1]) || edge.nodes[1];

    if (newA === newB) {
      graph.undirectedEdges.delete(edgeId);
    } else if (newA !== edge.nodes[0] || newB !== edge.nodes[1]) {
      graph.undirectedEdges.set(edgeId, { ...edge, nodes: [newA, newB] });
    }
  }

  // Update metadata
  graph.metadata.nodeCount = graph.nodes.size;
  graph.metadata.directedEdgeCount = graph.directedEdges.size;
  graph.metadata.undirectedEdgeCount = graph.undirectedEdges.size;
  graph.metadata.updatedAt = Date.now();

  return { graph, mergedCount };
}
