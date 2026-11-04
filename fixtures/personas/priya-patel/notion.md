# Priya Patel — Research Notes & Engineering Log

Notes on RAG benchmarks, context window utilization, and synthetic data generation.

## Current Experiments (2025 - 2026)
- **Hybrid Retrieval vs Pure Dense Search**: On specialized domain queries (part numbers, technical jargon), BM25 + Reciprocal Rank Fusion (RRF) consistently outperforms pure cosine dense embeddings by 24% Hit@5.
- **Chunk Boundary Optimization**: Testing markdown header-aware semantic chunking vs fixed-token sliding windows. Header-aware chunking preserves table context and improves downstream citation accuracy.
- **Grounding Verifiers**: Implementing NLI (Natural Language Inference) models as guardrail checks to detect ungrounded model hallucination before streaming tokens to users.

## Key Publications & Talks
- "Evaluating RAG in Mission-Critical Production Environments" — AI Engineer Summit 2024
- "Low-Latency Vector Search with Quantized KV Caches" — SysML Workshop 2023
- "Entity Extraction in Specialized Unstructured Text" — EMNLP 2019
