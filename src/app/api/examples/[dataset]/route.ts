import { NextResponse } from 'next/server';
import { fetchAllWikipediaArticles } from '@/examples/wikipedia/fetcher';
import { buildGraph } from '@/core/graph/graph-builder';
import { setGraph } from '@/core/graph/graph-store';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dataset: string }> }
) {
  const { dataset } = await params;

  if (dataset === 'wikipedia') {
    try {
      const documents = await fetchAllWikipediaArticles((current, total, title) => {
        console.log(`[Wikipedia] Fetching ${current}/${total}: ${title}`);
      });

      if (documents.length === 0) {
        return NextResponse.json({ error: 'No articles fetched' }, { status: 500 });
      }

      const result = buildGraph(documents, 'History of Computing (Wikipedia)');
      setGraph(result);

      return NextResponse.json({
        success: true,
        stats: {
          documentsProcessed: documents.length,
          nodeCount: result.metadata.nodeCount,
          directedEdgeCount: result.metadata.directedEdgeCount,
          undirectedEdgeCount: result.metadata.undirectedEdgeCount,
        },
      });
    } catch (err) {
      console.error('Wikipedia pipeline error:', err);
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: `Unknown dataset: ${dataset}. Available: wikipedia` },
    { status: 400 }
  );
}
