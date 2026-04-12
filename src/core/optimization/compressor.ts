import { nanoid } from 'nanoid';
import type { KnowledgeGraph, GraphNode, DirectedEdge, UndirectedEdge, NodeId } from '@/core/types';

// Hierarchical compression using label propagation community detection
// Creates Level 1 summary nodes from clusters of Level 0 nodes

export function compressGraph(graph: KnowledgeGraph): {
  graph: KnowledgeGraph;
  communitiesFound: number;
} {
  // Only compress Level 0 content nodes (skip structural nodes)
  const contentNodes = new Map<NodeId, GraphNode>();
  for (const [id, node] of graph.nodes) {
    if (node.level === 0 && node.type !== 'document' && node.type !== 'section') {
      contentNodes.set(id, node);
    }
  }

  if (contentNodes.size < 10) {
    return { graph, communitiesFound: 0 };
  }

  // Build adjacency from undirected edges (for community detection)
  const adjacency = new Map<NodeId, Set<NodeId>>();
  for (const edge of graph.undirectedEdges.values()) {
    const [a, b] = edge.nodes;
    if (!contentNodes.has(a) || !contentNodes.has(b)) continue;

    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }

  // Label propagation: each node starts with its own label
  const labels = new Map<NodeId, string>();
  for (const nodeId of contentNodes.keys()) {
    labels.set(nodeId, nodeId);
  }

  // Iterate label propagation (max 10 rounds)
  const nodeIds = Array.from(contentNodes.keys());
  for (let round = 0; round < 10; round++) {
    let changed = false;

    // Shuffle for randomness
    shuffleArray(nodeIds);

    for (const nodeId of nodeIds) {
      const neighbors = adjacency.get(nodeId);
      if (!neighbors || neighbors.size === 0) continue;

      // Count neighbor labels
      const labelCounts = new Map<string, number>();
      for (const neighbor of neighbors) {
        const label = labels.get(neighbor)!;
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      }

      // Pick most common label
      let maxCount = 0;
      let bestLabel = labels.get(nodeId)!;
      for (const [label, count] of labelCounts) {
        if (count > maxCount) {
          maxCount = count;
          bestLabel = label;
        }
      }

      if (bestLabel !== labels.get(nodeId)) {
        labels.set(nodeId, bestLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Group nodes by community label
  const communities = new Map<string, NodeId[]>();
  for (const [nodeId, label] of labels) {
    const group = communities.get(label) || [];
    group.push(nodeId);
    communities.set(label, group);
  }

  // Filter out singleton communities and very small ones
  const significantCommunities = Array.from(communities.entries())
    .filter(([, members]) => members.length >= 3);

  if (significantCommunities.length === 0) {
    return { graph, communitiesFound: 0 };
  }

  // Create Level 1 summary nodes for each community
  for (const [communityLabel, memberIds] of significantCommunities) {
    const members = memberIds.map(id => graph.nodes.get(id)!).filter(Boolean);

    // Build summary: collect top entities and representative content
    const allEntities = new Map<string, number>();
    for (const member of members) {
      for (const entity of member.entities) {
        allEntities.set(entity, (allEntities.get(entity) || 0) + 1);
      }
    }

    // Top 10 entities by frequency
    const topEntities = Array.from(allEntities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([entity]) => entity);

    // Summary content: top 3 shortest member contents (likely the most focused)
    const sortedMembers = [...members].sort((a, b) => a.content.length - b.content.length);
    const summaryContent = sortedMembers
      .slice(0, 3)
      .map(m => m.content)
      .join(' | ');

    const summaryNodeId = nanoid();
    const summaryNode: GraphNode = {
      id: summaryNodeId,
      content: `[Cluster: ${topEntities.slice(0, 5).join(', ')}] ${summaryContent.slice(0, 300)}`,
      contentHash: `cluster-${communityLabel}`,
      type: 'concept',
      source: members[0].source,
      entities: topEntities,
      metadata: {
        level: 1,
        memberCount: members.length,
        communityId: communityLabel,
      },
      level: 1,
      confidence: 0.8,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    };

    graph.nodes.set(summaryNodeId, summaryNode);

    // Add directed "contains" edges from summary to members
    for (const memberId of memberIds) {
      const edge: DirectedEdge = {
        id: nanoid(),
        from: summaryNodeId,
        to: memberId,
        type: 'contains',
        weight: 0.7,
      };
      graph.directedEdges.set(edge.id, edge);
    }
  }

  // Update metadata
  graph.levels = 2;
  graph.metadata.nodeCount = graph.nodes.size;
  graph.metadata.directedEdgeCount = graph.directedEdges.size;
  graph.metadata.updatedAt = Date.now();

  return {
    graph,
    communitiesFound: significantCommunities.length,
  };
}

function shuffleArray(arr: string[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
