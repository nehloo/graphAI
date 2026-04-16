# Graphnosis — Benchmark History

This document tells the full story of how Graphnosis went from a conceptual question about AI and graphs to a system that scores **72.20%** on the official LongMemEval benchmark — above Zep (71.20%) — using end-to-end QA with a GPT-4 judge and pure TypeScript only:

### What it took for Graphnosis to score **72.20%** on LongMemEval end-to-end QA with an official GPT-4 judge:
- Pure TypeScript, no vector DB, no fine-tuning
- text-embedding-3-small (cheapest embedding model)
- gpt-4o answer model + gpt-4o judge
- TF-IDF + embedding hybrid retrieval with session-diverse seeding
- Sibling-turn expansion, semantic reranking, aggregation-aware prompting
- Official LongMemEval judge prompts, verbatim

---

## The Original Question

It started with a casual question to an AI: *"Are AI models based on non-oriented graphs?"*

That question — simple enough to ask, deep enough to sit with — pulled together threads that had been accumulating for decades.

In 1993, at an Informatics high school in Romania, graph theory was part of the curriculum. Oriented graphs, non-oriented graphs, traversal algorithms. These structures felt like a natural way to model how things connect — more expressive than arrays, more flexible than trees. But the practical applications at the time were limited to textbook exercises, and the idea got filed away.

In the late 1990s, a C++ neural network class took shape: a training loop that accepted hand-drawn pixel letters as input (via a custom pixel editor — the [EditIcon](https://github.com/nehloo/EditIcon) project) and trained itself to recognize them through repeated cycles. It worked. It felt like the future. But the infrastructure to do anything meaningful with it didn't exist yet.

Years later, that question about AI and graphs surfaced again — and this time everything connected.

The deeper question underneath it: **why do knowledge and memory files have to be human-readable?**

Markdown, prose, plain text — these formats are optimized for humans. They carry redundant phrasing, implicit relationships, linear structure that buries non-linear connections, and ambiguity that humans resolve with world knowledge but AI has to guess at. But AI doesn't need prose. It needs structure — typed relationships, weighted edges, traversable paths. What if knowledge was stored in a format designed for machine comprehension rather than human readability? Fewer tokens, explicit edges, richer reasoning paths.

That question became the hypothesis behind Graphnosis: **structured typed edges outperform flat text chunks for AI comprehension**.

---

## The Architecture That Followed

The hypothesis suggested a specific design:

- **Dual-graph** over the same node set — directed edges for causal, temporal, and hierarchical relationships; undirected edges for similarity and co-occurrence. Most graph RAG systems use one graph type. Using both gives AI models richer traversal paths.
- **Zero-API graph construction** — TF-IDF similarity (pure JS), no embedding API calls required to build the graph. $0 to ingest.
- **AI-native binary format (.gai)** — built on MessagePack with a 4-byte magic header, node/edge count metadata, and a checksum. Not designed to be opened in a text editor. Designed for fast machine consumption.
- **Temporal awareness** — every node tracks `createdAt`, `lastAccessedAt`, `accessCount`, `validUntil`, and `confidence` (which decays ~1%/day after 7 days without access). Knowledge that isn't reinforced fades.
- **Human correction layer** — add facts, supersede outdated info, bulk-import markdown. Human-corrected nodes get maximum confidence (1.0) and never decay.

---

## Phase 1 — v0.1: Dual-Graph System (commit `d4ae95a`)

The first working version ingested 51 Wikipedia articles on the history of computing:
- **12,199 nodes**, **67,578 edges**
- Pure TF-IDF similarity — zero API calls to build
- BFS traversal with temporal scoring
- Subgraph serialization with explicit edge types for LLM context

This wasn't a benchmark run yet. It was proof that the pipeline worked end-to-end: raw text → typed graph → serialized subgraph → LLM answer.

---

## Phase 2 — Expanding the System

Additional PoC datasets were added (arXiv papers, Next.js documentation, NASA Mars data), along with the optimization layer:

- **Deduplicator** — content-hash deduplication prevents redundant nodes
- **Pruner** — auto-removes orphan nodes after graph construction
- **Hierarchical compressor** — creates multi-resolution zoom levels
- **Reflection engine** — automated contradiction detection, transitive edge inference, cross-domain discovery

---

## Phase 3 — Internal Benchmarks (12/12)

Before running any external benchmark, a custom LongMemEval-inspired test suite was built (`tests/longmemeval/longmemeval.test.ts`):

- 12 tests across 4 categories: Single-Session Recall, Multi-Source Recall, Knowledge Update, Temporal Reasoning
- Tests whether the graph retrieves the right keywords — no LLM judge, pure subgraph recall
- Result: **12/12 (100%)** — the graph retrieval pipeline could find the right nodes for known questions

This was a useful sanity check, but not a true measure of end-to-end answer quality. That required the official benchmark.

---

## Phase 4 — Official LongMemEval Runner

The [LongMemEval benchmark](https://github.com/xiaowu0162/LongMemEval) (ICLR 2025, xiaowu0162) is the standard for evaluating conversational memory systems. It consists of:

- **500 conversation-QA pairs** across 5 question types: single-session-user, single-session-assistant, multi-session, knowledge-update, temporal-reasoning, single-session-preference
- **End-to-end QA scoring** — the system ingests conversations, then answers questions about them. A GPT-4 judge scores each answer using the verbatim official prompts.
- **Not retrieval recall** — the score reflects whether the final answer is correct, not whether the right passage was retrieved.

This matters for comparison: MemPalace's 96.6% / 100% figures are **retrieval recall R@5** (is the correct session in the top 5 results?). That's a legitimate and useful metric — but it measures something different. A system can score 100% R@5 and still give wrong answers if its reader/reasoner fails. The LongMemEval end-to-end score is stricter.

The official runner was implemented at `tests/longmemeval/official/run.ts`, using the verbatim judge prompts. All scores below are end-to-end QA accuracy.

---

## The Benchmark Iteration Log

Every run is numbered. Smoke tests use 20 questions (fast iteration). Full runs use all 500.

### Run 0 — Baseline: **40.00%** (smoke, 20q)

*Config:* gpt-4o-mini answer / gpt-4o judge / TF-IDF-only retrieval

The first honest measurement. TF-IDF retrieval alone, no embeddings, gpt-4o-mini answering. Temporal reasoning was the weakest category (33.33% — 3/9). Multi-session also struggled (25% — 1/4).

---

### Runs 1–5 — TF-IDF Refinement: **45% → 60%** (smoke)

Iterating on query tuning, seed finding, and temporal prompt improvements without changing the retrieval method:

| Run | Score | Key change |
|-----|-------|------------|
| 1 | 45.00% | Initial query prompt tuning |
| 2 | 55.00% | Wider seed finding — more candidate nodes considered |
| 3 | 60.00% | Sharper single-session + knowledge-update handling |
| 4 | 50.00% | Regression — sibling expansion introduced instability |
| 5 | 60.00% | Temporal prompt improvements, recovered from regression |

The ceiling of TF-IDF-only retrieval on smoke tests was around 60%. To go further required better retrieval at the source.

---

### Run 6 — First Full Run: **56.00%** (500q)

*Config:* gpt-4o-mini / TF-IDF-only / 500 questions

First time running all 500 questions. Key findings from category breakdown:

| Category | Score |
|---|---|
| single-session-user | 79.69% |
| single-session-assistant | 82.14% |
| knowledge-update | 65.28% |
| temporal-reasoning | 49.61% |
| multi-session | 31.40% |
| single-session-preference | 30.00% |

Multi-session and temporal reasoning were clearly the bottlenecks. The model struggled to connect facts across multiple conversation sessions and to reason about time-ordered events.

---

### Run 7 — Embeddings Introduced: **55.00%** (smoke, 7 errors)

*Config:* gpt-4o-mini / hybrid (TF-IDF + text-embedding-3-small) / first attempt

Semantic embeddings (text-embedding-3-small) were added as an optional retrieval layer alongside TF-IDF — "hybrid" mode. The first run hit a concurrency bug: 7 of 20 questions errored out with API rate limit failures. The raw score on non-errored questions showed improvement in multi-session, but the instability made the result unreliable.

---

### Run 8 — Hybrid Working: **75.00%** (smoke)

*Config:* gpt-4o-mini / hybrid / concurrency errors fixed

Fixed the embedding API errors. With hybrid retrieval working correctly on the smoke set, the score jumped from 60% to 75%. Multi-session improved from 50% to 75% (3/4). The combination of TF-IDF graph traversal + semantic similarity was meaningfully better than either alone.

---

### Run 9 — Scale Failure: **45.20%** (500q, 158 errors)

*Config:* gpt-4o-mini / hybrid / 500 questions

Scaling hybrid retrieval to all 500 questions exposed a deeper problem: the OpenAI embedding API's TPM (tokens per minute) limit. With concurrent embedding calls across 500 conversations, 158 questions errored out. The valid 342 questions scored reasonably well, but the error rate made the overall result meaningless.

---

### Run 10 — Hybrid Stable: **67.20%** (500q)

*Config:* gpt-4o-mini / hybrid / serial concurrency (concurrency=1)

Fixed the TPM throttling by forcing serial embedding calls (`concurrency=1`, `maxRetries=3`). With 0 errors across 500 questions, the score jumped 22 points from the TF-IDF baseline.

| Category | Score |
|---|---|
| single-session-user | 89.06% |
| single-session-assistant | 82.14% |
| knowledge-update | 76.39% |
| temporal-reasoning | 58.27% |
| multi-session | 52.89% |
| single-session-preference | 40.00% |

Multi-session improved from 31.40% to 52.89%. Temporal reasoning from 49.61% to 58.27%. The hybrid retrieval was doing real work.

---

### Run 11 — Answer Model Upgrade: **75.00%** (smoke)

*Config:* **gpt-4o** answer / gpt-4o judge / hybrid

Upgraded the answering model from gpt-4o-mini to gpt-4o. On the 20-question smoke test: knowledge-update hit 100%, single-session-user hit 100%, temporal-reasoning reached 77.78%.

---

### Run 12 — First Full gpt-4o Run: **70.80%** (500q)

*Config:* gpt-4o / hybrid / 500 questions / 0 errors

| Category | Score |
|---|---|
| single-session-user | 95.31% |
| knowledge-update | 80.56% |
| single-session-assistant | 82.14% |
| temporal-reasoning | 69.29% |
| multi-session | 52.07% |
| single-session-preference | 36.67% |

Single-session recall was now very strong. Multi-session and preference questions remained the gap. Temporal reasoning had improved but still had room.

---

### Run 13 — Preference + Reranking Tuning: **70.00%** (smoke)

*Config:* gpt-4o / hybrid / preference prompting + semantic reranking

Added preference prompting (explicit instructions for preference-type questions) and semantic reranking of retrieved candidates. The smoke score dipped slightly, suggesting the reranking needed further calibration, but the approach was directionally right.

---

### Run 14 — Best Result: **72.20%** (500q) — Beat Zep

*Config:* gpt-4o / hybrid / aggregation-aware retrieval + multi-session prompt

The key addition was **aggregation-aware retrieval**: recognizing when a question requires aggregating across multiple sessions (e.g., "how many times total did X happen?") vs. superseding (e.g., "what is the current value of X?"). A dedicated prompt for multi-session aggregation questions was added alongside the aggregation logic.

| Category | Score |
|---|---|
| single-session-user | 95.31% (61/64) |
| knowledge-update | 83.33% (60/72) |
| single-session-assistant | 82.14% (46/56) |
| temporal-reasoning | 70.08% (89/127) |
| multi-session | 58.68% (71/121) |
| single-session-preference | 26.67% (8/30) |

**Overall: 72.20% (361/500)**

This placed Graphnosis above Zep (71.20%) on the published leaderboard, measured by the same end-to-end QA methodology.

---

## Full Progression at a Glance

| Run | Questions | Score | Config |
|-----|-----------|-------|--------|
| 0 | 20 (smoke) | 40.00% | gpt-4o-mini / TF-IDF |
| 1 | 20 | 45.00% | gpt-4o-mini / TF-IDF |
| 2 | 20 | 55.00% | gpt-4o-mini / TF-IDF |
| 3 | 20 | 60.00% | gpt-4o-mini / TF-IDF |
| 4 | 20 | 50.00% | gpt-4o-mini / TF-IDF (regression) |
| 5 | 20 | 60.00% | gpt-4o-mini / TF-IDF |
| **6** | **500** | **56.00%** | gpt-4o-mini / TF-IDF |
| 7 | 20 | 55.00% | gpt-4o-mini / hybrid (7 errors) |
| 8 | 20 | 75.00% | gpt-4o-mini / hybrid |
| **9** | **500** | **45.20%** | gpt-4o-mini / hybrid (158 errors) |
| **10** | **500** | **67.20%** | gpt-4o-mini / hybrid / serial |
| 11 | 20 | 75.00% | gpt-4o / hybrid |
| **12** | **500** | **70.80%** | gpt-4o / hybrid |
| 13 | 20 | 70.00% | gpt-4o / hybrid / reranking |
| **14** | **500** | **72.20%** | gpt-4o / hybrid / aggregation-aware |

---

## Leaderboard Context

All scores below are **end-to-end QA** with an official GPT-4 judge, using the LongMemEval methodology:

| System | Score |
|---|---|
| Agentmemory V4 | 96.20% |
| PwC Chronos | 95.60% |
| OMEGA | 95.40% |
| Mastra | 94.87% |
| Supermemory | 85.86% |
| **Graphnosis** | **72.20%** |
| Zep | 71.20% |

**On MemPalace:** MemPalace reports 96.6% (ChromaDB baseline) and 100% (Hybrid v4 + Haiku rerank) — but these are **retrieval recall R@5** scores (is the correct session in the top 5 retrieved?), not end-to-end QA. MemPalace's own BENCHMARKS.md is explicit about this distinction: *"MemPal's strength is retrieval recall, not end-to-end QA accuracy — a different metric than some competitors publish."* Their honest end-to-end generalizable figure on held-out questions is 98.4% R@5 — still retrieval, not QA.

Both metrics are valid. R@5 measures retrieval quality in isolation. End-to-end QA measures the full pipeline including answer generation. They answer different questions about system quality.

---

## Where the Gap Is

The two weakest categories in Run 14:

**Single-session-preference (26.67%):** Questions about user preferences stated across a session (e.g., "what kind of music does the user like?"). The system retrieves relevant turns but struggles to synthesize preference signals that are spread across many small mentions rather than stated directly.

**Multi-session (58.68%):** Questions requiring aggregation or synthesis across many separate conversations. Improved significantly from the TF-IDF baseline (31.40%), but the ceiling here is higher. Aggregation-aware logic helped; more structured session indexing would help further.

---

## What's Next

- **Preference questions** — dedicated preference extraction pass during ingestion; explicit preference nodes in the graph
- **Multi-session reasoning** — structured session summaries as first-class graph nodes; cross-session edge types
- **NLP-based relation extraction** — replacing heuristic `causes`/`contradicts` detection with model-based extraction
- **Embedding-native similarity** — optional upgrade from TF-IDF to full embedding similarity for undirected edges
