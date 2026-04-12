import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getGraph } from '@/core/graph/graph-store';
import { queryGraph, buildGraphPrompt } from '@/core/query/query-engine';

export async function POST(request: Request) {
  const { messages } = await request.json();
  const lastMessage = messages[messages.length - 1];

  // Extract text from the last user message
  const question = extractText(lastMessage);

  const graphData = getGraph();
  if (!graphData || !graphData.tfidfIndex) {
    return new Response(
      JSON.stringify({ error: 'No graph loaded. Load a dataset first.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Query the graph to get relevant subgraph
  const { subgraph } = queryGraph(graphData, graphData.tfidfIndex, question);

  // Build the prompt with graph context
  const systemPrompt = buildGraphPrompt(subgraph.serialized, question);

  // Manually convert UIMessages (parts-based) to ModelMessages (content-based)
  const modelMessages = messages.map(toModelMessage);

  // Stream the response using Vercel AI SDK v6
  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(message: any): string {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p: { type: string }) => p.type === 'text')
      .map((p: { text: string }) => p.text)
      .join(' ');
  }
  if (typeof message.content === 'string') {
    return message.content;
  }
  return '';
}

// Convert a UIMessage (v6 parts format) to a ModelMessage (content format)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toModelMessage(msg: any): { role: string; content: string } {
  return {
    role: msg.role,
    content: extractText(msg),
  };
}
