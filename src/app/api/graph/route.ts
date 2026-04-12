import { NextResponse } from 'next/server';
import { getGraph, getGraphStats, toSerializable } from '@/core/graph/graph-store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get('format');

  const graph = getGraph();
  if (!graph) {
    return NextResponse.json({ error: 'No graph loaded. Ingest data first.' }, { status: 404 });
  }

  if (format === 'full') {
    const serializable = toSerializable(graph);
    return NextResponse.json(serializable);
  }

  // Default: return visualization-friendly format
  const nodes = Array.from(graph.nodes.values()).map(n => ({
    id: n.id,
    label: n.content.slice(0, 60) + (n.content.length > 60 ? '...' : ''),
    type: n.type,
    entities: n.entities,
    level: n.level,
  }));

  const directedLinks = Array.from(graph.directedEdges.values()).map(e => ({
    source: e.from,
    target: e.to,
    type: e.type,
    weight: e.weight,
    directed: true,
  }));

  const undirectedLinks = Array.from(graph.undirectedEdges.values()).map(e => ({
    source: e.nodes[0],
    target: e.nodes[1],
    type: e.type,
    weight: e.weight,
    directed: false,
  }));

  return NextResponse.json({
    nodes,
    links: [...directedLinks, ...undirectedLinks],
    stats: getGraphStats(),
  });
}
