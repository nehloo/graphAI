import { NextResponse } from 'next/server';
import { getGraph } from '@/core/graph/graph-store';
import { queryGraph } from '@/core/query/query-engine';

const BENCHMARK_QUERIES = [
  'Who invented the Turing machine?',
  'What is Boolean algebra?',
  'How does ARPANET relate to the Internet?',
  'What programming languages were created first?',
  'Explain the von Neumann architecture.',
  'When was the first electronic computer built?',
  'Who is Tim Berners-Lee?',
  'What is Moore\'s law?',
  'How did Unix influence operating systems?',
  'What is machine learning?',
];

export async function GET() {
  const graphData = getGraph();
  if (!graphData || !graphData.tfidfIndex) {
    return NextResponse.json({ error: 'No graph loaded' }, { status: 404 });
  }

  const results = [];

  for (const query of BENCHMARK_QUERIES) {
    const start = performance.now();
    const { subgraph, seeds } = queryGraph(graphData, graphData.tfidfIndex, query);
    const elapsed = performance.now() - start;

    results.push({
      query,
      timeMs: Math.round(elapsed * 100) / 100,
      seedCount: seeds.length,
      nodeCount: subgraph.nodes.length,
      edgeCount: subgraph.directedEdges.length + subgraph.undirectedEdges.length,
      serializedTokenEstimate: Math.ceil(subgraph.serialized.length / 4), // ~4 chars per token
      topSeedScore: seeds[0]?.score || 0,
    });
  }

  const avgTime = results.reduce((sum, r) => sum + r.timeMs, 0) / results.length;
  const avgNodes = results.reduce((sum, r) => sum + r.nodeCount, 0) / results.length;
  const avgTokens = results.reduce((sum, r) => sum + r.serializedTokenEstimate, 0) / results.length;

  return NextResponse.json({
    graphStats: {
      totalNodes: graphData.nodes.size,
      totalDirectedEdges: graphData.directedEdges.size,
      totalUndirectedEdges: graphData.undirectedEdges.size,
      graphName: graphData.name,
    },
    benchmarks: results,
    summary: {
      avgQueryTimeMs: Math.round(avgTime * 100) / 100,
      avgNodesRetrieved: Math.round(avgNodes * 10) / 10,
      avgTokenEstimate: Math.round(avgTokens),
      queriesRun: results.length,
    },
  });
}
