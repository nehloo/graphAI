import type { KnowledgeGraph, SerializableGraph, TfidfIndex } from '@/core/types';

// In-memory graph store with serialization helpers
// In a production system, this would be backed by a database

let currentGraph: (KnowledgeGraph & { tfidfIndex?: TfidfIndex }) | null = null;

export function setGraph(graph: KnowledgeGraph & { tfidfIndex?: TfidfIndex }): void {
  currentGraph = graph;
}

export function getGraph(): (KnowledgeGraph & { tfidfIndex?: TfidfIndex }) | null {
  return currentGraph;
}

export function clearGraph(): void {
  currentGraph = null;
}

// Convert Map-based graph to plain arrays for JSON/MessagePack serialization
export function toSerializable(graph: KnowledgeGraph): SerializableGraph {
  return {
    id: graph.id,
    name: graph.name,
    nodes: Array.from(graph.nodes.values()),
    directedEdges: Array.from(graph.directedEdges.values()),
    undirectedEdges: Array.from(graph.undirectedEdges.values()),
    levels: graph.levels,
    metadata: graph.metadata,
  };
}

// Convert serialized graph back to Map-based graph
export function fromSerializable(data: SerializableGraph): KnowledgeGraph {
  return {
    id: data.id,
    name: data.name,
    nodes: new Map(data.nodes.map(n => [n.id, n])),
    directedEdges: new Map(data.directedEdges.map(e => [e.id, e])),
    undirectedEdges: new Map(data.undirectedEdges.map(e => [e.id, e])),
    levels: data.levels,
    metadata: data.metadata,
  };
}

// Get graph stats for the dashboard
export function getGraphStats() {
  if (!currentGraph) return null;

  const nodesByType = new Map<string, number>();
  for (const node of currentGraph.nodes.values()) {
    nodesByType.set(node.type, (nodesByType.get(node.type) || 0) + 1);
  }

  const directedByType = new Map<string, number>();
  for (const edge of currentGraph.directedEdges.values()) {
    directedByType.set(edge.type, (directedByType.get(edge.type) || 0) + 1);
  }

  const undirectedByType = new Map<string, number>();
  for (const edge of currentGraph.undirectedEdges.values()) {
    undirectedByType.set(edge.type, (undirectedByType.get(edge.type) || 0) + 1);
  }

  return {
    nodeCount: currentGraph.nodes.size,
    directedEdgeCount: currentGraph.directedEdges.size,
    undirectedEdgeCount: currentGraph.undirectedEdges.size,
    nodesByType: Object.fromEntries(nodesByType),
    directedEdgesByType: Object.fromEntries(directedByType),
    undirectedEdgesByType: Object.fromEntries(undirectedByType),
    sourceFiles: currentGraph.metadata.sourceFiles,
    name: currentGraph.name,
  };
}
