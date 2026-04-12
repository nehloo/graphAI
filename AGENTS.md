# graphAI — Agent Guidelines

## Project Overview

graphAI is a research prototype that converts raw files into AI-optimized dual-graph knowledge representations. It explores whether structured graphs with typed edges can outperform flat-text RAG for AI comprehension and retrieval.

**Origin:** The project began with the question "Are AI models based on non-oriented graphs?" — which evolved into exploring whether knowledge represented as directed + undirected graphs, serialized in a binary format not designed for human readability, could produce better AI outputs than human-readable formats like markdown.

## Architecture Principles

1. **Dual-graph over same node set.** Every knowledge unit (node) has both directed edges (causal, temporal, hierarchical) and undirected edges (similarity, association). This provides richer reasoning paths than either graph type alone.

2. **AI-native serialization.** The .gai binary format (MessagePack) is optimized for token efficiency, not human readability. The subgraph serialization format (`[nodeId|type|score] content`) is designed for LLM consumption.

3. **Zero-API similarity.** TF-IDF + cosine similarity runs entirely in-process with no external API calls. This makes the pipeline fully local and open-source friendly. Embedding support is optional.

4. **Explicit relationships in prompts.** Instead of flat text chunks, the LLM receives a structured subgraph with typed edges. This enables chain-of-thought reasoning along graph edges rather than forcing the model to infer connections.

## Security and Robustness Guardrails

### Input Validation
- All file parsers handle malformed input gracefully (empty content, missing sections)
- PDF parser uses heuristic section detection with fallback to single-section mode
- CSV/JSON parsers validate structure before processing
- Wikipedia/arXiv fetchers have per-request error handling — one failed fetch doesn't crash the pipeline

### Graph Integrity
- **Content hash deduplication:** Nodes with identical content produce identical hashes; duplicates are detected and merged during optimization
- **Checksum verification:** .gai files include a 4-byte checksum; corrupted files are rejected on read with a clear error
- **Edge weight thresholds:** Similarity edges require cosine ≥ 0.3; entity edges require Jaccard ≥ 0.2. Below these thresholds, edges are not created — preventing noise
- **Orphan pruning:** Nodes with zero edges are removed during optimization to prevent dead-end traversals

### Performance Bounds
- **O(n) similarity via inverted index:** Instead of comparing all node pairs (O(n^2)), an inverted term index identifies candidate pairs that share at least one term. Terms appearing in 500+ documents are skipped as non-discriminative
- **Max 10 edges per node:** Prevents hub explosion where a few generic nodes accumulate thousands of edges
- **Max 50 similarity candidates per node:** Caps the comparison work per node
- **Max 20 nodes per query subgraph:** Keeps the serialized context within LLM token budgets (~2K tokens avg)
- **3-hop BFS with 0.6 decay:** Traversal score decays exponentially with distance, naturally limiting subgraph size
- **Rate limiting:** Wikipedia (100ms), arXiv (3s), NASA (2s) between API requests

### Data Safety
- In-memory graph store — no persistent state between server restarts
- No user data is stored or transmitted beyond the current session
- API keys are loaded from environment variables, never hardcoded
- .env files are gitignored; only .env.example is committed

## Code Conventions

- TypeScript strict mode throughout
- All graph types defined in `src/core/types.ts` — single source of truth
- Parsers are stateless functions: `(input, sourceFile) → ParsedDocument`
- Graph operations are pure: `(graph, params) → { graph, stats }`
- AI SDK v6 patterns: `@ai-sdk/react` for client, manual UIMessage→ModelMessage conversion on server

## Key Files

| File | Purpose |
|------|---------|
| `src/core/types.ts` | All TypeScript interfaces — the data model |
| `src/core/graph/graph-builder.ts` | Central module: documents → dual graph |
| `src/core/graph/undirected-edges.ts` | TF-IDF similarity + entity overlap edges |
| `src/core/query/query-engine.ts` | Full query pipeline: seed → traverse → serialize |
| `src/core/format/gai-writer.ts` | .gai binary serialization |
| `src/core/query/subgraph-serializer.ts` | Structured format sent to LLM |

<!-- BEGIN:nextjs-agent-rules -->
# Next.js Version Notice
This project uses Next.js 16. APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
