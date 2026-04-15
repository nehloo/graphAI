import type { NodeId, TfidfIndex } from '@/core/types';
import { SEED_COUNT } from '@/core/constants';
import { queryVector, getTfidfVector } from '@/core/similarity/tfidf';
import { cosineSimilarity } from '@/core/similarity/cosine';
import type { EmbeddingIndex, EmbeddingVector } from '@/core/similarity/embeddings';
import { cosineSimilarity as embedCosine } from '@/core/similarity/embeddings';

export interface ScoredSeed {
  nodeId: NodeId;
  score: number;
}

export function findSeeds(
  query: string,
  tfidfIndex: TfidfIndex,
  maxSeeds: number = SEED_COUNT
): ScoredSeed[] {
  const qVec = queryVector(tfidfIndex, query);
  if (qVec.size === 0) return [];

  const scores: ScoredSeed[] = [];

  for (const nodeId of tfidfIndex.documents.keys()) {
    const nodeVec = getTfidfVector(tfidfIndex, nodeId);
    const score = cosineSimilarity(qVec, nodeVec);
    if (score > 0) {
      scores.push({ nodeId, score });
    }
  }

  // Sort by score descending and take top K
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, maxSeeds);
}

// Embedding-based variant. Caller pre-embeds the query (one API call) and
// passes the vector in; we just rank nodes by cosine similarity. Used when
// the literal-term overlap of TF-IDF misses semantically-related sessions
// ("work history" vs "previous job at Acme").
export function findSeedsByEmbedding(
  queryVec: EmbeddingVector,
  embeddingIndex: EmbeddingIndex,
  maxSeeds: number = SEED_COUNT,
  minScore: number = 0.2
): ScoredSeed[] {
  const scores: ScoredSeed[] = [];
  for (const [nodeId, vec] of embeddingIndex.vectors) {
    const score = embedCosine(queryVec, vec);
    if (score >= minScore) scores.push({ nodeId, score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, maxSeeds);
}
