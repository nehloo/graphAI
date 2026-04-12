export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  // Use the smaller map for iteration
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];

  for (const [term, valA] of smaller) {
    const valB = larger.get(term);
    if (valB !== undefined) {
      dotProduct += valA * valB;
    }
    normA += valA * valA;
  }

  // Add remaining terms from larger to normB, plus terms already counted
  for (const [term, val] of larger) {
    normB += val * val;
  }

  // Add uncounted terms from smaller to normA
  // (already counted above)

  // Recompute normA fully
  normA = 0;
  for (const val of a.values()) normA += val * val;
  normB = 0;
  for (const val of b.values()) normB += val * val;

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
