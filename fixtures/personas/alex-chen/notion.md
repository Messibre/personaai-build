# Alex Chen — Engineering & Design Philosophy

Personal engineering workspace and notes on design systems, web performance, and spatial user interfaces.

## Current Focus (2025 - 2026)
- **Fluid Micro-interactions**: Developing zero-runtime spring physics curves that compile directly to CSS `@keyframes` with fallback steps.
- **Local-first Collaborative Canvas**: Exploring CRDTs (Yjs) combined with WebGPU rendering for instant offline-first vector diagramming.
- **Accessibility by Default**: Enforcing strict contrast ratio tokens, focus ring heuristics, and screen-reader navigable canvas nodes.

## Key Projects & Case Studies

### 1. CanvasFlow Architecture
- Solved bottleneck with 10,000+ DOM nodes by shifting from SVG DOM rendering to a dual-layer canvas architecture: an offscreen WebGL scene for high-frequency rasterization and an invisible accessibility tree for assistive tech.
- Benchmarks show 60fps pan/zoom on 4K displays even on mid-range laptops.

### 2. Motion Tokens RFC
- Standardized animation durations, bezier easings, and physics parameters across web and native apps.
- Enforces user preference detection via `prefers-reduced-motion: reduce` across all animated primitives.

## Speaking & Writing
- "High-Performance Graphics in Modern Web Applications" — ReactConf 2024
- "Design Tokens Beyond Color: Standardizing Motion and Depth" — Smashing Magazine (2023)
