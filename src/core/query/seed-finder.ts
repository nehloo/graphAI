import type { NodeId, TfidfIndex } from '@/core/types';
import { SEED_COUNT } from '@/core/constants';
import { queryVector, getTfidfVector } from '@/core/similarity/tfidf';
import { cosineSimilarity } from '@/core/similarity/cosine';

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
