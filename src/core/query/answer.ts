import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { KnowledgeGraph, SubgraphContext, TfidfIndex, NodeId } from '@/core/types';
import { queryGraph, buildGraphPrompt } from './query-engine';
import { embedQuery, type EmbeddingIndex } from '@/core/similarity/embeddings';

// Non-streaming question-answering helper.
// Shared by the /api/graph/query route and the LongMemEval official runner
// so both paths use the exact same retrieval + prompt + model.

export type RetrievalMode = 'tfidf' | 'embeddings' | 'hybrid';

export interface AnswerOptions {
  model?: string; // OpenAI model id; defaults to gpt-4o-mini (same as chat route)
  priorMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  questionDate?: string; // ISO date treated as "today" for the prompt
  maxNodes?: number; // Override subgraph size cap (default: TOP_K_NODES = 20)
  // Retrieval mode:
  //   'tfidf'      - lexical term overlap only (default; no API calls for retrieval)
  //   'embeddings' - semantic only (requires embeddingIndex on the graph)
  //   'hybrid'     - merge TF-IDF and embedding seeds
  retrieval?: RetrievalMode;
  embeddingIndex?: EmbeddingIndex; // required when retrieval !== 'tfidf'
  embeddingModel?: string; // for embedding the query (default text-embedding-3-small)
}

export interface AnswerResult {
  answer: string;
  subgraph: SubgraphContext;
  seeds: Array<{ nodeId: NodeId; score: number }>;
  nodeCount: number;
  systemPrompt: string;
  retrieval: RetrievalMode;
}

export async function answerQuestion(
  graph: KnowledgeGraph,
  tfidfIndex: TfidfIndex,
  question: string,
  opts: AnswerOptions = {}
): Promise<AnswerResult> {
  const retrieval: RetrievalMode = opts.retrieval ?? 'tfidf';

  // Embed the query once if we're going to use it. Skipped in tfidf-only mode
  // so we don't pay for an unused API call.
  let queryEmbedding: number[] | null = null;
  if (retrieval !== 'tfidf') {
    if (!opts.embeddingIndex) {
      throw new Error(
        `answerQuestion: retrieval=${retrieval} requires embeddingIndex on the graph (call attachEmbeddings first)`
      );
    }
    queryEmbedding = await embedQuery(question, { model: opts.embeddingModel });
  }

  const { subgraph, seeds } = queryGraph(graph, tfidfIndex, question, {
    maxNodes: opts.maxNodes,
    embeddingIndex: retrieval === 'tfidf' ? undefined : opts.embeddingIndex,
    queryEmbedding: queryEmbedding ?? undefined,
    embeddingsOnly: retrieval === 'embeddings',
  });

  const systemPrompt = buildGraphPrompt(subgraph.serialized, question, {
    questionDate: opts.questionDate,
  });

  const messages = [
    ...(opts.priorMessages ?? []),
    { role: 'user' as const, content: question },
  ];

  const result = await generateText({
    model: openai(opts.model ?? 'gpt-4o-mini'),
    system: systemPrompt,
    messages,
  });

  return {
    answer: result.text,
    subgraph,
    seeds,
    nodeCount: subgraph.nodes.length,
    systemPrompt,
    retrieval,
  };
}
