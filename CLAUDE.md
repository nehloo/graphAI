# graphAI — Project Context

## What This Is
A research prototype exploring AI-native knowledge representation through dual-graph structures.
Core thesis: structured graphs with typed edges outperform flat text chunks for AI comprehension.

## Architecture
- **Pipeline:** raw files → parse → chunk → extract entities → build graph → optimize → .gai binary → query → LLM
- **Dual graph:** directed edges (causal, temporal, hierarchical) + undirected edges (similarity, co-occurrence) over same node set
- **Similarity:** TF-IDF + cosine (pure JS, zero API calls) with inverted term index optimization
- **Query:** seed finding → BFS traversal with decay → subgraph serialization → LLM prompt
- **Format:** .gai binary (MessagePack with magic bytes + checksum)

## Key Technical Decisions
- AI SDK v6: `useChat` from `@ai-sdk/react`, `DefaultChatTransport` for custom API URL, `sendMessage({text})`, `status` not `isLoading`, `msg.parts` not `msg.content`
- Server route must manually convert UIMessages (parts-based) to ModelMessages (content-based) for `streamText`
- `react-force-graph-2d` callbacks need `any` types due to library's generic node/link typing
- Undirected edge builder uses inverted term index to avoid O(n^2) full scan
- Wikipedia fetcher uses `wtf_wikipedia`, arXiv uses XML API (3s rate limit), Next.js docs from GitHub raw

## Commands
```bash
npm run dev    # Start dev server (port 3000)
npm run build  # Production build
npm run lint   # ESLint
```

## Environment
```
OPENAI_API_KEY=sk-...  # Required for chat/LLM features
NASA_API_KEY=...       # Optional, defaults to DEMO_KEY
```

## File Layout
```
src/core/          # Engine: types, parsers, extraction, similarity, graph, optimization, format, query
src/examples/      # 4 PoC dataset fetchers (wikipedia, arxiv, nextjs-docs, nasa-mars)
src/app/           # Next.js pages (dashboard, examples, graph viz, chat, benchmarks)
src/app/api/       # API routes (ingest, graph, query, context, benchmark, examples)
data/              # Runtime: raw files, .gai graphs, TF-IDF cache (gitignored)
```

## Guardrails
- Content hash deduplication prevents duplicate nodes
- Edge weight thresholds prevent noise (similarity ≥ 0.3, entity Jaccard ≥ 0.2)
- Max 10 edges per node cap prevents hub explosion
- Max 50 similarity candidates per node prevents O(n^2) blowup
- Max 20 nodes per query subgraph keeps token budget bounded
- BFS traversal capped at 3 hops with 0.6 decay factor
- .gai checksum validates file integrity on read
- Inverted term index skips terms appearing in 500+ documents (too common to be discriminative)
