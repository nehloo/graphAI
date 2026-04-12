import { nanoid } from 'nanoid';
import type {
  KnowledgeGraph,
  NodeId,
  Contradiction,
  ConnectionDiscovery,
  DirectedEdge,
} from '@/core/types';
import { cosineSimilarity } from '@/core/similarity/cosine';
import { getTfidfVector } from '@/core/similarity/tfidf';
import type { TfidfIndex } from '@/core/types';
import { jaccardSimilarity } from '@/core/similarity/jaccard';

export interface ReflectionResult {
  contradictions: Contradiction[];
  discoveries: ConnectionDiscovery[];
  superseded: number;
  decayed: number;
  inferred: number;
}

// The reflection engine — runs periodically to consolidate, detect contradictions,
// discover connections, decay old knowledge, and infer missing edges

export function reflect(
  graph: KnowledgeGraph,
  tfidfIndex: TfidfIndex
): ReflectionResult {
  const result: ReflectionResult = {
    contradictions: [],
    discoveries: [],
    superseded: 0,
    decayed: 0,
    inferred: 0,
  };

  // 1. Contradiction detection
  result.contradictions = detectContradictions(graph, tfidfIndex);

  // 2. Connection discovery (surprising cross-domain links)
  result.discoveries = discoverConnections(graph, tfidfIndex);

  // 3. Time-based decay
  result.decayed = decayConfidence(graph);

  // 4. Transitive edge inference
  result.inferred = inferEdges(graph);

  graph.metadata.updatedAt = Date.now();

  return result;
}

// Find nodes that share entities but make conflicting claims
function detectContradictions(
  graph: KnowledgeGraph,
  tfidfIndex: TfidfIndex
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  // Group nodes by shared MEANINGFUL entities (skip short/generic ones)
  const entityNodes = new Map<string, NodeId[]>();
  for (const [nodeId, node] of graph.nodes) {
    if (node.type === 'document' || node.type === 'section' || node.type === 'person') continue;
    if (node.content.length < 50) continue; // Skip very short nodes
    for (const entity of node.entities) {
      // Skip generic entities: single words, numbers, short terms
      if (entity.length < 4) continue;
      if (/^\d+$/.test(entity)) continue;
      if (GENERIC_TERMS.has(entity.toLowerCase())) continue;

      const list = entityNodes.get(entity) || [];
      list.push(nodeId);
      entityNodes.set(entity, list);
    }
  }

  // For each entity, compare nodes that mention it
  for (const [entity, nodeIds] of entityNodes) {
    if (nodeIds.length < 2 || nodeIds.length > 30) continue;

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < Math.min(i + 5, nodeIds.length); j++) {
        const nodeA = graph.nodes.get(nodeIds[i])!;
        const nodeB = graph.nodes.get(nodeIds[j])!;

        // Both nodes must have substantial content
        if (nodeA.content.length < 60 || nodeB.content.length < 60) continue;

        // Need at least 2 shared meaningful entities (not just one)
        const sharedEntities = nodeA.entities.filter(e =>
          e.length >= 4 && nodeB.entities.some(be => be.toLowerCase() === e.toLowerCase())
        );
        if (sharedEntities.length < 2) continue;

        const entityOverlap = jaccardSimilarity(nodeA.entities, nodeB.entities);
        const vecA = getTfidfVector(tfidfIndex, nodeIds[i]);
        const vecB = getTfidfVector(tfidfIndex, nodeIds[j]);
        const contentSim = cosineSimilarity(vecA, vecB);

        // High entity overlap + low content similarity = potential contradiction
        // Tighter thresholds: overlap > 0.6 (was 0.5), similarity < 0.15 (was 0.2)
        if (entityOverlap > 0.6 && contentSim < 0.15) {
          const hasConflict = detectConflictSignals(nodeA.content, nodeB.content);
          if (hasConflict) {
            contradictions.push({
              nodeA: nodeIds[i],
              nodeB: nodeIds[j],
              sharedEntities: nodeA.entities.filter(e => nodeB.entities.includes(e)),
              description: `Potential contradiction about ${entity}`,
              detectedAt: Date.now(),
              resolved: false,
            });

            // Add a contradicts edge
            const edge: DirectedEdge = {
              id: nanoid(),
              from: nodeIds[i],
              to: nodeIds[j],
              type: 'contradicts',
              weight: 0.7,
              evidence: `Conflicting claims about ${entity}`,
              createdAt: Date.now(),
            };
            graph.directedEdges.set(edge.id, edge);
          }
        }
      }
    }
  }

  return contradictions;
}

function detectConflictSignals(contentA: string, contentB: string): boolean {
  const a = contentA.toLowerCase();
  const b = contentB.toLowerCase();

  // Only flag actual contradictory claims — not just any text with negation words.
  // Require STRONG conflict signals: explicit disagreement or correction patterns.

  const strongConflictPatterns = [
    /\bnot\s+(?:a|an|the)\s/,       // "not a planet" vs "is a planet"
    /\bno longer\b/,                  // "no longer considered"
    /\bwas\s+(?:not|never)\b/,       // "was not invented by"
    /\breplaced\s+by\b/,             // "replaced by X" vs "still uses Y"
    /\bcontrary\s+to\b/,            // "contrary to popular belief"
    /\bis\s+(?:incorrect|wrong|false|inaccurate)\b/,
    /\bwas\s+(?:incorrect|wrong|false|inaccurate)\b/,
    /\breclassified\b/,
    /\bdisputed\b/,
    /\bdisproven\b/,
  ];

  const aHasStrong = strongConflictPatterns.some(p => p.test(a));
  const bHasStrong = strongConflictPatterns.some(p => p.test(b));

  // At least one side must have a strong conflict signal
  if (!aHasStrong && !bHasStrong) return false;

  // AND the other side must make a positive claim about the same subject
  // (having a strong signal alone isn't enough — both sides need substance)
  if (a.length < 80 || b.length < 80) return false;

  return true;
}

// Find surprising connections between nodes in different domains/sources
function discoverConnections(
  graph: KnowledgeGraph,
  tfidfIndex: TfidfIndex
): ConnectionDiscovery[] {
  const discoveries: ConnectionDiscovery[] = [];

  // Group nodes by source file (domain)
  const domainNodes = new Map<string, NodeId[]>();
  for (const [nodeId, node] of graph.nodes) {
    if (node.type === 'document' || node.type === 'section') continue;
    const domain = node.source.file.split(':')[0]; // e.g., "wikipedia", "arxiv"
    const list = domainNodes.get(domain) || [];
    list.push(nodeId);
    domainNodes.set(domain, list);
  }

  const domains = Array.from(domainNodes.keys());
  if (domains.length < 2) return discoveries;

  // Compare entities across domains
  for (let d1 = 0; d1 < domains.length; d1++) {
    for (let d2 = d1 + 1; d2 < domains.length; d2++) {
      const nodes1 = domainNodes.get(domains[d1])!;
      const nodes2 = domainNodes.get(domains[d2])!;

      // Sample to avoid explosion
      const sample1 = nodes1.slice(0, 100);
      const sample2 = nodes2.slice(0, 100);

      for (const id1 of sample1) {
        const node1 = graph.nodes.get(id1)!;
        if (node1.entities.length === 0) continue;

        for (const id2 of sample2) {
          const node2 = graph.nodes.get(id2)!;
          if (node2.entities.length === 0) continue;

          const shared = node1.entities.filter(e =>
            node2.entities.some(e2 => e2.toLowerCase() === e.toLowerCase())
          );

          if (shared.length >= 2) {
            // Check if an edge already exists
            const alreadyConnected = Array.from(graph.undirectedEdges.values()).some(
              e => (e.nodes[0] === id1 && e.nodes[1] === id2) ||
                   (e.nodes[0] === id2 && e.nodes[1] === id1)
            );

            if (!alreadyConnected) {
              discoveries.push({
                nodeA: id1,
                nodeB: id2,
                bridgeEntities: shared,
                surprise: Math.min(shared.length * 0.2, 0.9),
                discoveredAt: Date.now(),
              });
            }
          }
        }
      }
    }
  }

  // Sort by surprise and take top 20
  discoveries.sort((a, b) => b.surprise - a.surprise);
  return discoveries.slice(0, 20);
}

// Decay confidence of nodes that haven't been accessed recently
function decayConfidence(graph: KnowledgeGraph): number {
  const now = Date.now();
  const ONE_DAY = 86_400_000;
  let decayed = 0;

  for (const [, node] of graph.nodes) {
    if (node.type === 'document' || node.type === 'section' || node.type === 'person') continue;

    const daysSinceAccess = (now - node.lastAccessedAt) / ONE_DAY;

    // Only decay if not accessed in 7+ days
    if (daysSinceAccess > 7) {
      const decayFactor = Math.max(0.5, 1 - (daysSinceAccess - 7) * 0.01);
      const newConfidence = node.confidence * decayFactor;

      if (newConfidence < node.confidence) {
        node.confidence = Math.max(0.1, newConfidence); // Floor at 0.1
        decayed++;
      }
    }
  }

  return decayed;
}

// Infer transitive edges: if A→B and B→C with same type, infer A→C with reduced weight
function inferEdges(graph: KnowledgeGraph): number {
  let inferred = 0;
  const existingPairs = new Set<string>();

  // Index existing edges
  for (const edge of graph.directedEdges.values()) {
    existingPairs.add(`${edge.from}:${edge.to}`);
  }

  // Build adjacency for specific transitive edge types
  const transitiveTypes = new Set(['causes', 'depends-on', 'supports']);
  const adjacency = new Map<NodeId, Array<{ to: NodeId; type: string; weight: number }>>();

  for (const edge of graph.directedEdges.values()) {
    if (!transitiveTypes.has(edge.type)) continue;
    const list = adjacency.get(edge.from) || [];
    list.push({ to: edge.to, type: edge.type, weight: edge.weight });
    adjacency.set(edge.from, list);
  }

  // Check 2-hop paths
  const newEdges: DirectedEdge[] = [];

  for (const [nodeA, neighbors] of adjacency) {
    for (const { to: nodeB, type, weight: weightAB } of neighbors) {
      const bNeighbors = adjacency.get(nodeB) || [];
      for (const { to: nodeC, type: type2, weight: weightBC } of bNeighbors) {
        if (type !== type2) continue; // Same edge type only
        if (nodeA === nodeC) continue; // No self-loops
        if (existingPairs.has(`${nodeA}:${nodeC}`)) continue; // Already exists

        const inferredWeight = weightAB * weightBC * 0.5; // Decay for inference
        if (inferredWeight < 0.15) continue; // Too weak

        newEdges.push({
          id: nanoid(),
          from: nodeA,
          to: nodeC,
          type: type as DirectedEdge['type'],
          weight: inferredWeight,
          evidence: `Inferred: ${nodeA}→${nodeB}→${nodeC}`,
          createdAt: Date.now(),
        });

        existingPairs.add(`${nodeA}:${nodeC}`);
        inferred++;

        if (inferred >= 100) break; // Cap inference
      }
      if (inferred >= 100) break;
    }
    if (inferred >= 100) break;
  }

  for (const edge of newEdges) {
    graph.directedEdges.set(edge.id, edge);
  }

  graph.metadata.directedEdgeCount = graph.directedEdges.size;

  return inferred;
}

// Generic terms that should not trigger contradiction detection
const GENERIC_TERMS = new Set([
  'first', 'second', 'third', 'last', 'new', 'old', 'next', 'previous',
  'general', 'special', 'common', 'standard', 'modern', 'early', 'late',
  'large', 'small', 'high', 'low', 'long', 'short', 'major', 'minor',
  'important', 'significant', 'similar', 'different', 'various', 'several',
  'many', 'most', 'some', 'other', 'such', 'based', 'used', 'known',
  'called', 'named', 'given', 'made', 'found', 'developed', 'designed',
  'published', 'released', 'introduced', 'proposed', 'described',
  'gaussian', 'linear', 'digital', 'analog', 'binary', 'parallel',
  'system', 'model', 'method', 'process', 'program', 'device',
]);
