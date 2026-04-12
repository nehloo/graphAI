import type { TfidfIndex, NodeId } from '@/core/types';
import { STOPWORDS } from '@/core/constants';

export function createTfidfIndex(): TfidfIndex {
  return {
    documents: new Map(),
    idf: new Map(),
    documentCount: 0,
  };
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

export function addDocument(index: TfidfIndex, nodeId: NodeId, text: string): void {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();

  // Compute term frequency
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  // Normalize TF by document length
  const maxFreq = Math.max(...tf.values(), 1);
  const normalizedTf = new Map<string, number>();
  for (const [term, freq] of tf) {
    normalizedTf.set(term, freq / maxFreq);
  }

  index.documents.set(nodeId, normalizedTf);
  index.documentCount++;
}

export function computeIdf(index: TfidfIndex): void {
  const termDocCount = new Map<string, number>();

  // Count how many documents each term appears in
  for (const tfMap of index.documents.values()) {
    for (const term of tfMap.keys()) {
      termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
    }
  }

  // Compute IDF: log(N / df) with smoothing
  for (const [term, df] of termDocCount) {
    index.idf.set(term, Math.log((index.documentCount + 1) / (df + 1)) + 1);
  }
}

export function getTfidfVector(index: TfidfIndex, nodeId: NodeId): Map<string, number> {
  const tf = index.documents.get(nodeId);
  if (!tf) return new Map();

  const tfidf = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    const idfVal = index.idf.get(term) || 0;
    tfidf.set(term, tfVal * idfVal);
  }
  return tfidf;
}

export function queryVector(index: TfidfIndex, text: string): Map<string, number> {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  const maxFreq = Math.max(...tf.values(), 1);
  const tfidf = new Map<string, number>();

  for (const [term, freq] of tf) {
    const idfVal = index.idf.get(term) || 0;
    tfidf.set(term, (freq / maxFreq) * idfVal);
  }

  return tfidf;
}
