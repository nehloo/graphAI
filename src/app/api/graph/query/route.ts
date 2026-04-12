import { streamText } from 'ai';
import { getGraph } from '@/core/graph/graph-store';
import { queryGraph, buildGraphPrompt } from '@/core/query/query-engine';

export async function POST(request: Request) {
  const { messages } = await request.json();
  const lastMessage = messages[messages.length - 1];
  const question = lastMessage.content;

  const graphData = getGraph();
  if (!graphData || !graphData.tfidfIndex) {
    return new Response(
      JSON.stringify({ error: 'No graph loaded. Load a dataset first.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Query the graph to get relevant subgraph
  const { subgraph, seeds } = queryGraph(graphData, graphData.tfidfIndex, question);

  // Build the prompt with graph context
  const systemPrompt = buildGraphPrompt(subgraph.serialized, question);

  // Stream the response using Vercel AI SDK v6
  const result = streamText({
    model: 'openai/gpt-5.4',
    system: systemPrompt,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
