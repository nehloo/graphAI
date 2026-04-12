import { NextResponse } from 'next/server';
import { getGraph } from '@/core/graph/graph-store';
import { queryGraph } from '@/core/query/query-engine';

// Returns the subgraph context for a query (without LLM call)
export async function POST(request: Request) {
  const { question } = await request.json();

  const graphData = getGraph();
  if (!graphData || !graphData.tfidfIndex) {
    return NextResponse.json({ error: 'No graph loaded' }, { status: 404 });
  }

  const { subgraph, seeds } = queryGraph(graphData, graphData.tfidfIndex, question);

  return NextResponse.json({
    serialized: subgraph.serialized,
    nodeCount: subgraph.nodes.length,
    directedEdgeCount: subgraph.directedEdges.length,
    undirectedEdgeCount: subgraph.undirectedEdges.length,
    seeds: seeds.map(s => ({ nodeId: s.nodeId, score: s.score })),
    nodes: subgraph.nodes.map(n => ({
      id: n.id,
      content: n.content.slice(0, 200),
      type: n.type,
      entities: n.entities,
    })),
  });
}
