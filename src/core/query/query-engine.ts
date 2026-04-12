import type { KnowledgeGraph, QueryResult, TfidfIndex } from '@/core/types';
import { findSeeds } from './seed-finder';
import { traverseGraph } from './traverser';
import { serializeSubgraph } from './subgraph-serializer';

export function queryGraph(
  graph: KnowledgeGraph,
  tfidfIndex: TfidfIndex,
  question: string
): Omit<QueryResult, 'answer'> {
  // Step 1: Find seed nodes via TF-IDF matching
  const seeds = findSeeds(question, tfidfIndex);

  if (seeds.length === 0) {
    return {
      subgraph: {
        nodes: [],
        directedEdges: [],
        undirectedEdges: [],
        serialized: '=== KNOWLEDGE SUBGRAPH (0 nodes, 0 edges) ===\nNo relevant nodes found for this query.',
      },
      seeds: [],
    };
  }

  // Step 2: Traverse graph from seeds to collect relevant subgraph
  const traversalResult = traverseGraph(graph, seeds);

  // Step 3: Serialize the subgraph for LLM consumption
  const subgraph = serializeSubgraph(
    traversalResult.nodes,
    traversalResult.directedEdges,
    traversalResult.undirectedEdges,
    traversalResult.scores
  );

  return {
    subgraph,
    seeds: seeds.map(s => ({ nodeId: s.nodeId, score: s.score })),
  };
}

// Build the system prompt for the LLM with the subgraph context
export function buildGraphPrompt(subgraphSerialized: string, question: string): string {
  return `You are a knowledge assistant powered by graphAI. You answer questions using ONLY the knowledge graph context provided below. If the context doesn't contain enough information, say so explicitly.

The context is a structured knowledge subgraph with typed nodes and edges:
- Nodes have types: fact, concept, entity, event, definition, claim, data-point
- Directed edges show relationships: causes, depends-on, precedes, contains, defines, cites, contradicts, supports
- Undirected edges show associations: similar-to, co-occurs, shares-entity, shares-topic, same-source
- Each node has a relevance score (higher = more relevant to the query)

Use the edge relationships to reason about connections between concepts. Follow directed edges for causal and temporal reasoning. Use undirected edges for context and related information.

${subgraphSerialized}

Question: ${question}`;
}
