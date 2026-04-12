# graphAI — Dual-Graph Knowledge System

**Can AI understand files better than humans can read them?**

graphAI transforms raw files into AI-optimized directed and undirected graph representations. Instead of feeding AI models flat text chunks (the standard RAG approach), graphAI builds a structured knowledge graph with typed relationships — then serializes relevant subgraphs into a format designed for machine comprehension, not human readability.

The result: faster retrieval, richer reasoning, and answers that trace back through explicit relationship chains.

---

## The Question That Started This

> *"Are AI models based on non-oriented graphs?"*

This question led to an exploration: if AI models internally process information through graph-like structures, could we *externally* represent knowledge the same way? Not as markdown files humans read, but as graph structures AI models traverse?

The insight: **human-readable formats are lossy for AI consumption.** Prose contains redundant phrasing, implicit relationships, linear structure that hides non-linear connections, and ambiguity that humans resolve with world knowledge but AI must guess at. A purpose-built AI-native format could be dramatically more efficient.

## How It Works

### The Pipeline

```
RAW FILES (any format)
    ↓
EXTRACTION — Parse, chunk, extract entities and relationships
    ↓
GRAPH CONSTRUCTION — Build dual-graph with typed edges
    ↓
OPTIMIZATION — Deduplicate, prune, compress into hierarchical levels
    ↓
.gai FILES — Binary-packed, AI-native format (MessagePack)
    ↓
QUERY — Traverse graph, extract relevant subgraph, serialize for LLM
    ↓
ANSWER — LLM reasons over structured context with explicit relationships
```

### The Dual-Graph Model

Every piece of knowledge exists as a **node**. Nodes are connected by two types of edges:

**Directed edges** (arrows — A → B) represent:
- `contains` — a section contains a paragraph
- `precedes` — one fact follows another in sequence
- `cites` — one source references another
- `defines` — a definition explains a concept used elsewhere
- `causes`, `supports`, `contradicts` — causal and logical relationships

**Undirected edges** (lines — A ↔ B) represent:
- `similar-to` — two facts share vocabulary (measured by TF-IDF cosine similarity)
- `shares-entity` — two facts mention the same person, place, or concept
- `co-occurs` — two facts appear in the same section
- `same-source` — two facts come from the same document

Both edge types exist over the **same node set**. A fact about Alan Turing might have a directed `precedes` edge to the next fact in the article, AND an undirected `shares-entity` edge to a fact about the Turing machine in a different article. This dual structure gives AI models richer reasoning paths than either graph type alone.

### The .gai Format

Instead of storing knowledge as human-readable markdown, graphAI uses a binary format (`.gai`) built on MessagePack:

```
[4-byte magic: "GAI" + version]
[4-byte header length]
[MessagePack header: node count, edge count, levels, metadata]
[MessagePack body: nodes, directed edges, undirected edges, hierarchy]
[4-byte checksum]
```

This isn't designed for humans to read. It's designed for AI to consume efficiently — fewer tokens, explicit structure, typed relationships.

### How Queries Work

When you ask a question:

1. **Seed finding** — TF-IDF matching identifies the most relevant nodes (75ms avg across 12K nodes)
2. **Graph traversal** — BFS from seed nodes along directed and undirected edges, with score decay per hop
3. **Subgraph extraction** — Top 20 nodes + their connecting edges are collected
4. **Serialization** — The subgraph is converted to a structured text format:

```
=== KNOWLEDGE SUBGRAPH (20 nodes, 58 edges) ===

--- NODES ---
[n1|event|0.53] The Turing machine was invented in 1936 by Alan Turing...
[n2|fact|0.38] A universal Turing machine can simulate any other Turing machine...

--- DIRECTED ---
n1 -[defines:0.9]-> n2

--- UNDIRECTED ---
n1 ~[similar-to:0.7]~ n2
```

5. **LLM reasoning** — The AI receives this structured context and can follow edges for causal, temporal, and associative reasoning — rather than guessing connections from flat text.

## Why This Matters (vs. Standard RAG)

| Aspect | Standard RAG | graphAI |
|--------|-------------|---------|
| Context format | Flat text chunks | Structured subgraph with typed edges |
| Relationships | Implicit (AI must infer) | Explicit (edges with types and weights) |
| Retrieval | Vector similarity on chunks | Graph traversal from seed nodes |
| Resolution | Fixed chunk size | Hierarchical (zoom in/out via compression levels) |
| Dependencies | Requires embedding API | TF-IDF (pure JS, zero API calls for graph construction) |

## Proof-of-Concept Datasets

All datasets use freely-licensed public content:

| Dataset | Source | License | Result |
|---------|--------|---------|--------|
| **History of Computing** | Wikipedia (51 articles) | CC BY-SA 3.0 | 12,199 nodes, 67,578 edges |
| **Transformer Architecture** | arXiv (25 papers) | Open Access | Paper abstracts + metadata |
| **Next.js Documentation** | GitHub (30 pages) | MIT | Markdown docs + code examples |
| **NASA Mars Missions** | api.nasa.gov | Public Domain | Rover data + mission facts |

## Performance

Benchmarked on the Wikipedia dataset (12,199 nodes, 67,578 edges):

- **Avg query time:** 75ms (seed finding + graph traversal + serialization)
- **Avg nodes retrieved:** 20 per query
- **Avg token estimate:** ~2,138 tokens per subgraph context
- **Graph construction:** ~15 seconds for 51 Wikipedia articles

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment (required for chat/LLM features)
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local

# Run the development server
npm run dev
```

Open http://localhost:3000, go to **Examples**, load a dataset, then explore the **Graph** visualization or query it from **Chat**.

## Project Structure

```
src/
  core/
    types.ts                    # All TypeScript interfaces
    constants.ts                # Thresholds, magic bytes, stopwords
    ingestion/parsers/          # Markdown, PDF, HTML, CSV/JSON parsers
    extraction/                 # Chunker, entity extractor
    similarity/                 # TF-IDF, cosine, Jaccard (pure JS)
    graph/                      # Graph builder, directed/undirected edges, incremental updates
    optimization/               # Deduplicator, pruner, hierarchical compressor
    format/                     # .gai binary writer/reader (MessagePack)
    query/                      # Seed finder, BFS traverser, subgraph serializer
  examples/                     # Wikipedia, arXiv, Next.js docs, NASA Mars fetchers
  app/                          # Next.js App Router pages + API routes
```

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Vercel AI SDK v6** (chat interface, streaming)
- **MessagePack** (`msgpackr`) for .gai binary format
- **TF-IDF + cosine similarity** (pure JS, no embedding APIs)
- **react-force-graph-2d** for graph visualization
- **Tailwind CSS** for UI

## License

MIT

## Contributing

This is an active research project exploring AI-native knowledge representation. Contributions welcome — especially around:
- New parser types (DOCX, PPTX, audio transcripts)
- Improved relation extraction (NLP-based `causes`, `contradicts` detection)
- Embedding-based similarity as optional upgrade to TF-IDF
- Benchmark comparisons against standard RAG pipelines
- Multi-graph merge (combine multiple .gai files)
