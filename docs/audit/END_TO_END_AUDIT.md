# End-to-End Audit — Phase A (read-only)

Branch: `integrate/end-to-end` (evidence: `.git/HEAD` = `ref: refs/heads/integrate/end-to-end`).
Scope: read-only. This file is the only file created. No commands were run (see "Report format").

Citation convention: `file:line`. Anything not backed by a line I actually read in this audit is marked **UNVERIFIED**.
Files I opened earlier in the session but whose exact lines I did not re-check for a specific claim are listed in the appendix; claims that depend on them say UNVERIFIED.

---

## 0. Headline

V2 (vault → tailor) **cannot complete a single end-to-end run today**. Two independent P0s block it:

1. `lib/tailor/wire.ts:10` wires all four G functions to `lib/tailor/stubs.ts`, and each stub throws (`stubs.ts:21-35`). `analyzeStage` therefore always ends in `unavailable` (`pipeline.ts:91-92`), and `generateStage` would always end in `check_failed` (`pipeline.ts:175-176`).
2. Even with real G modules, a GitHub/resume user has **no UI to confirm imported facts** (J2 below). Only question answers become confirmed facts, so projects that have only imported facts are never eligible (`pipeline.ts:70-71`, `pipeline.ts:151`).

---

## 1. Journey traces

Legend: PASS / FAIL / BLOCKED / UNVERIFIED.

### J1 — Resume-only user

| # | Hop | Status | Evidence |
|---|-----|--------|----------|
| 1 | `app/vault/page.tsx` → `components/vault/import-panel.tsx` (reads `?id`) | PASS | `import-panel.tsx:18-19` read `searchParams.get("id")` |
| 2 | `import-panel` → `lib/ingest/client.ts:importResumeText` → `POST /api/import/resume` | UNVERIFIED (hop exists) | `ingest/client.ts:84` defines `importResumeText`; route is guarded at `app/api/import/resume/route.ts:57` |
| 3 | route → `lib/ingest/resume.ts:extractResume` (delimited prompt) | PASS (delimiting) | `resume.ts:87` "untrusted DATA between the BEGIN and END markers"; `resume.ts:103` `BEGIN RESUME ${nonce}`; `resume.ts:133` `extractResume` |
| 4 | extraction → `lib/ingest/merge.ts` → vault facts with `confirmed:false` | UNVERIFIED | merge.ts was read earlier in the session; lines not re-checked here |
| 5 | **user confirms imported facts** | **FAIL** | See J2 hop 5. No confirm control exists for imported facts. |
| 6 | `/tailor?id=` → `tailor-flow.tsx:analyzeJob` → `POST /api/tailor/analyze` → `pipeline.ts:analyzeStage` | **BLOCKED** | `tailor-flow.tsx:93` calls client `analyzeJob`; `pipeline.ts:74` calls `deps.analyzeJob`, which is the throwing stub (`wire.ts:10`, `stubs.ts:21-23`); caught at `pipeline.ts:91-92` → `unavailable` |
| 7 | `generateStage` → `rewriteForJob` → `checkDraft` | **BLOCKED** | `pipeline.ts:174` calls `deps.checkDraft` = stub (`stubs.ts:33-35`) → `pipeline.ts:175-176` `check_failed` |
| 8 | `tailor-flow` → `lib/tailor/record.ts:recordIfGenerated` → save → reload | UNVERIFIED | `tailor-flow.tsx:15` imports `recordIfGenerated`; persistence path not re-checked line by line |

Zod boundaries: `generateStage` re-validates checker output with `checkResultSchema.safeParse` and `draftSchema.safeParse` (`pipeline.ts:174,178`), and rejects checker output that adds sentences (`pipeline.ts:182-183`, `onlyContainsOriginalSentences` at `pipeline.ts:127-141`). PASS for the contract. The analyze-side output (`AnalyzeJobResult`) has no Zod re-parse in `analyzeStage` (`pipeline.ts:74-90`): it trusts `analysis.data` as a `JobProfile`. **UNVERIFIED** whether the real G `analyzeJob` will parse with `.strict()`.

### J2 — GitHub user

| # | Hop | Status | Evidence |
|---|-----|--------|----------|
| 1 | pick ≤ 6 repos → `POST /api/import/repos` | UNVERIFIED (limit) | route is guarded at `app/api/import/repos/route.ts:73`; the 6-repo cap was not re-checked |
| 2 | deep dive → draft facts (`confirmed:false`) | UNVERIFIED | |
| 3 | three questions: draft → `POST /api/questions/draft` | PASS (delimiting) | `questions/draft.ts:42` "untrusted DATA between the BEGIN and END markers"; `draft.ts:64` `BEGIN SOURCES ${nonce}`; route guarded at `app/api/questions/draft/route.ts:57` |
| 4 | answers confirm → `lib/questions/confirm.ts` | UNVERIFIED (details) | confirm.ts read earlier in the session; hashing helper at `confirm.ts:18` |
| 5 | **user confirms imported github/resume facts (built, tech, role…)** | **FAIL** | `components/vault/project-list.tsx` renders project info and an external link (`project-list.tsx:54`) but has no confirm/toggle control for individual imported facts. The grep for links and controls across `components/vault/**` found nothing that confirms facts. |
| 6 | tailor → generate | BLOCKED | same as J1 hops 6-7 |

**Impact of hop 5:**
- Picks: `analyzeStage` only offers projects in `vaultWithEligibleProjects` (`pipeline.ts:70`); a project with no confirmed facts returns `vault_empty` (`pipeline.ts:71`, message at `pipeline.ts:97-100`). `validatePicks` rejects it as well (`pipeline.ts:151`). A GitHub user who skips the questions cannot tailor at all.
- Rewrite: `toRewriteFacts` drops every unconfirmed fact (`lib/rewrite/context.ts:41-45`), so imported "built X with Y" facts never reach the prompt. That respects invariant 1, but the output is thinner.
- Gaps: `detectGaps` receives the **full** vault, `input.vault`, not `eligible` (`pipeline.ts:77`). Unless the G implementation filters on `confirmed === true` itself, unconfirmed facts would count as evidence and could hide a real gap. This breaks invariant 1 ("…or count as evidence for gaps/picks"). It's a P1 contract hole, filed as F-05.

### J3 — Gap path

| # | Hop | Status | Evidence |
|---|-----|--------|----------|
| 1 | `analyzeStage` → `deps.detectGaps(job, vault)` | BLOCKED | stub throws (`stubs.ts:25-27`); called at `pipeline.ts:77` |
| 2 | gaps returned in `{ job, gaps, picks }` | PASS (shape) | `pipeline.ts:90` |
| 3 | rendered in `components/tailor/analysis-review.tsx` | UNVERIFIED (render) | `analysis-review.tsx:9` imports `Gap`; `tailor-flow.tsx:11` imports `Gap`. I did not re-read the render lines |

### J4 — Injection (malicious persona + "ignore previous instructions" posting)

| Entry point of untrusted text | Delimited? | Evidence |
|---|---|---|
| Resume text → `extractResume` | Yes, with a nonce | `ingest/resume.ts:87,103` |
| README / repo sources → questions draft | Yes, with a nonce | `questions/draft.ts:42,64` |
| Vault context (facts and project names) → rewrite | Yes, with a **fixed** marker and no nonce | `rewrite/rewrite.ts:28,45` (`BEGIN_CONTEXT_JSON`) |
| Job posting → `analyzeJob` (V2) | **BLOCKED / does not exist** | stub only (`stubs.ts:21`) |
| Job posting → `lib/job-match/analyzer.ts:analyzeJob` (V3) | UNVERIFIED | the grep for delimiters across `lib/` found no marker in `lib/job-match/**` |
| Draft → `checkDraft` | does not exist | `stubs.ts:33` |
| Model output parsing | treated as untrusted | `llm/structured.ts:20` |

Notes:
- The rewrite context marker is a fixed string. A fact containing the literal `END_CONTEXT_JSON` could close the block early. Because the context is JSON-encoded (UNVERIFIED that `JSON.stringify` is used), the risk is low, but a nonce would match the other two prompts. Filed as F-11.
- Whether `fixtures/personas/malicious` is exercised against the resume, questions and rewrite prompts is UNVERIFIED (test list in the appendix; contents not re-read).

### J5 — Edit path

| # | Hop | Status | Evidence |
|---|-----|--------|----------|
| 1 | `components/tailor/editable-draft.tsx` → `lib/tailor/client.ts:editSentence` → `POST /api/tailor/edit` | PASS (wiring) | `editable-draft.tsx:11`; route guarded at `app/api/tailor/edit/route.ts:31` |
| 2 | route → `lib/tailor/edit.ts` with `{ checkDraft, llm }` | PASS (wiring) | `app/api/tailor/edit/route.ts:22` |
| 3 | `edit.ts` re-checks the edited draft | **BLOCKED** | `edit.ts:198` calls `deps.checkDraft` → stub throws |
| 4 | add-fact flow (new claim → new unconfirmed/confirmed fact) | UNVERIFIED | not re-read |

### J6 — Return loop (two postings, two hours apart)

| # | Hop | Status | Evidence |
|---|-----|--------|----------|
| 1 | `recordIfGenerated` after generate | UNVERIFIED | `tailor-flow.tsx:15`; `tests/tailor/record.test.ts:28` covers the checker-down case |
| 2 | hashing of the posting | UNVERIFIED | |
| 3 | storage via vault `applications` (`lib/vault/applications.ts`) | UNVERIFIED | |
| 4 | `GET /api/admin/metrics` | UNVERIFIED (auth) | `app/api/admin/metrics/route.ts:48`; `.env.example:25-26` says it returns 503 when `ADMIN_TOKEN` is unset |
| 5 | `/admin` page | UNVERIFIED | |

The whole journey is BLOCKED upstream, because generate never succeeds (J1 hop 7).

### J7 — Failure modes (what the user sees)

| Failure | Server behaviour | What the user sees | Status |
|---|---|---|---|
| LLM timeout | the timeout comes from env or 30 s (`llm/index.ts:20-24,46`); `.env.example:4` sets **10 s** | the rewrite throws → `unavailable` (`pipeline.ts:167-168`) | partial PASS; message text is `UNAVAILABLE_MESSAGE` (value UNVERIFIED) |
| Gemini/upstream rate limit | UNVERIFIED | `ingest/client.ts:27` maps a 429 or "rate limit" text to a rate-limit error | PASS for import; UNVERIFIED for tailor |
| Checker throws | `check_failed` (`pipeline.ts:175-176`) | "The fact checker could not run, so nothing was produced." | PASS (fail closed) |
| Store not configured on Vercel | `501` (`app/api/vault/[id]/route.ts:32,39`; `lib/vault/index.ts:14-17`) | `ingest/client.ts:22` surfaces the server's `error` string | PASS (message from server) |
| Beta code missing (401) | `withGuards` (`lib/security/guard.ts`, lines UNVERIFIED) | `ingest/client.ts:106` generic fallback unless the body has `error` | UNVERIFIED |
| Our rate limit (429) | `withGuards` limits per route (e.g. `tailor/analyze` max 10/min, `route.ts:24`) | `ingest/client.ts:27` keeps `too_many_requests` code | PASS for import; tailor client mapping UNVERIFIED |
| G stub not merged | `unavailable` (`pipeline.ts:91-92`) | indistinguishable from a real outage | FAIL (misleading). Filed as F-01 |

---

## 2. The three versions — duplicated responsibilities

| Responsibility | V1 legacy wizard | V2 vault → tailor (product) | V3 /job-match | Canonical | Action |
|---|---|---|---|---|---|
| Job analysis | none | `TailorDeps.analyzeJob(llm, text)` (`ports.ts:12`), **stub** | `lib/job-match/analyzer.ts:100` `analyzeJob(jobText)`, which has a different signature and return type (`JobAnalysis`) | V2 port | Implement the G module behind the V2 port; reuse V3 deterministic parsing (sections, taxonomy) via an adapter, not by changing the port |
| Matching / project picking | none | `pickProjects` port (`ports.ts:14`), stub | GitHub evidence scoring (`lib/job-match/github-evidence.ts`) | V2 port | V3 matching stays V3-only or feeds V2 later; do not merge in Phase B |
| Gap detection | none | `detectGaps` port (`ports.ts:13`), stub | V3 evidence ledger (`lib/job-match/report/store.ts`) | V2 | Implement G with a confirmed-only filter |
| Cover letter / note | `app/api/ai-content`, `app/api/generate` (UNVERIFIED) | `lib/outputs/**` note from `Draft` | `app/api/job-match/cover-letter/route.ts:16` | V2 | Freeze V1; mark V3's cover letter as a candidate to remove or to reuse V2 outputs |
| Gemini access | `lib/gemini.ts` plus inline calls in legacy routes | `lib/llm/**` (`getLLMClient`, `wire.ts:13-14`) | UNVERIFIED (whether job-match uses `lib/llm`) | `lib/llm` | V3 must use `lib/llm`; V1 frozen |
| URL fetching | `app/api/notion`, `app/api/ai-content` (allowlisted, `boundary-check.mjs:10-13`) | `lib/github.ts` (UNVERIFIED) | raw `fetch` (`github-evidence.ts:125`) | `lib/security/safe-fetch.ts` (target, L13 paused) | Add `api.github.com` to the fixed-provider list or route through `GITHUB_API`; fix the checker (F-08) |
| Storage | none / client | `lib/vault` file / Upstash (`lib/vault/index.ts:14-17`) | in-memory `Map` (`report/store.ts:3`) | `lib/vault` | V3 ledger is non-persistent on Vercel (F-09) |
| Guards (beta, rate limit) | none | `withGuards` on 7 routes | none | `lib/security/guard.ts` | Apply to V3 routes (F-06) |

---

## 3. Blockers known so far — verification

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| (a) | `wire.ts` imports throwing stubs; no `lib/job` or `lib/check` | **CONFIRMED** | `wire.ts:4-10` (TODO plus `import … from "./stubs"`); `stubs.ts:21-35` all throw `GModuleNotMergedError`; Glob `lib/job/**`, `lib/check/**` returned nothing |
| (b) | No real `checkDraft` anywhere | **CONFIRMED** | repo grep of `lib,app,components,tests`: definitions only in `stubs.ts:33`, the port type `ports.ts:15`, and the param type `edit.ts:85`; other hits are callers or test fakes |
| (c) | No link from `/vault` to `/tailor?id=` | **CONFIRMED** | grep for `/tailor` or `href=` in `app/vault/**`, `components/vault/**`: the only `href` is the external repo link `project-list.tsx:54`. `/tailor` expects `?id` (`tailor-flow.tsx:33-34`) and tells the user to "Open this page from your vault" (`tailor-flow.tsx:142`), which is impossible from the UI |
| (d) | Routes without `withGuards` | **CONFIRMED**, list below | grep of `app/api` |
| (e) | Unconfirmed data reaching the prompt via `context.ts` | **PARTLY CONFIRMED** | facts are filtered: `context.ts:43` `.filter((fact) => fact.confirmed === true)`. Not filtered: `context.ts:112` `techs: [...project.techs]` (project-level, never confirmed), `context.ts:111` `name: project.name`, `context.ts:121` experience `company`/`title`, `context.ts:125` `person.name`. `techs` is the real risk: a guessed or GitHub-language tech can be written into the output as a claim → invariant 2 ("no guessed tech") |
| (f) | `.env.example` 10000 vs default 30000 | **CONFIRMED** | `.env.example:4` `LLM_TIMEOUT_MS=10000`; `lib/llm/index.ts:20` `DEFAULT_LLM_TIMEOUT_MS = 30_000`; `lib/llm/gemini.ts:13` `DEFAULT_TIMEOUT_MS = 30_000`; env wins (`index.ts:24,46`). Anyone who copies `.env.example` gets 10 s, which is risky for the rewrite |
| (g) | job-match report store is an in-memory Map | **CONFIRMED** | `report/store.ts:3` `const records = new Map<string, EvidenceLedger>()`. On Vercel each function instance has its own memory and instances recycle, so `getLedger` (`store.ts:9`) returns `null` on another instance or after a cold start. Reports "disappear" at random. No size cap was seen in the lines read (UNVERIFIED) → unbounded growth within an instance |
| (h) | Does `boundary-check.mjs` flag `github-evidence.ts`? | **NOT FLAGGED, by accident** | The checker matches `/\bfetch\s*\(([^)]*)\)/` per **line** (`boundary-check.mjs:93`). `github-evidence.ts:125` is `fetch("https://api.github.com/graphql", {`, which has no `)` on that line → no match → silently skipped. Even on one line it would be flagged, because `api.github.com` is not in the fixed-provider list (`boundary-check.mjs:101-106`). Any multi-line `fetch(` call escapes the check |
| (i) | `GITHUB_TOKEN` documented for GraphQL? | **PARTLY** | It is documented, but only as optional and for "repo imports": `.env.example:16-18`, `README.md:112,122`. job-match reads it at `github-evidence.ts:168`, and GitHub GraphQL requires auth, so V3 fails without it (`github-evidence.ts:116,119`). Neither doc says job-match requires it |
| (j) | `tsconfig.tsbuildinfo` tracked; `docs/ci-pivot.patch` leftover | **FILES EXIST; tracking UNVERIFIED** | Glob found both at the repo root and under `docs/`. `.gitignore` has no `tsbuildinfo` or `*.patch` entry (grep: no match). Whether they are tracked needs `git ls-files`, which I may not run |
| (k) | Taxonomy coverage | **MOSTLY COVERED, gaps listed** | see below |

### (d) Routes without `withGuards`

| Route | File:line | Dangers |
|---|---|---|
| `GET/PUT/DELETE /api/vault/[id]` | `app/api/vault/[id]/route.ts:52,66,108` | Upstash write quota; no rate limit on overwrite or delete; vault id is the only secret (auth model UNVERIFIED); CPU (Zod parse of large bodies, size cap UNVERIFIED) |
| `POST /api/parse-resume` (V1) | `app/api/parse-resume/route.ts:13` | CPU (PDF parsing); Gemini quota UNVERIFIED |
| `POST /api/notion` (V1) | `app/api/notion/route.ts:37` | outbound fetch of a user-supplied URL (SSRF; allowlisted in `boundary-check.mjs:11`) |
| `POST /api/job-match` (V3) | `app/api/job-match/route.ts:15` | Gemini quota (UNVERIFIED); spends the GitHub token (GraphQL, `github-evidence.ts:125,168`); outbound fetch; CPU |
| `POST /api/job-match/cover-letter` (V3) | `app/api/job-match/cover-letter/route.ts:16` | Gemini quota (UNVERIFIED) |
| `POST /api/github` (V1) | `app/api/github/route.ts:11` | spends the GitHub token / IP rate limit |
| `POST /api/generate` (V1) | `app/api/generate/route.ts:113` | Gemini quota |
| `POST /api/ai-template` (V1) | `app/api/ai-template/route.ts:109` | Gemini quota |
| `POST /api/ai-content` (V1) | `app/api/ai-content/route.ts:238` | Gemini quota and outbound fetch (allowlisted) |
| `POST /api/deploy` (V1) | `app/api/deploy/route.ts:58` | spends the **Vercel token** (creates deployments) |
| `GET /api/admin/metrics` | `app/api/admin/metrics/route.ts:48` | gated by `ADMIN_TOKEN` (`.env.example:25-26`) but no rate limit → token brute force (comparison method UNVERIFIED) |

Guarded (for completeness): `tailor/analyze:24`, `tailor/generate:24`, `tailor/edit:31`, `questions/draft:57`, `import/resume:57`, `import/repos:73`.

### (k) Taxonomy (`lib/job-match/skills.json`)

Present: UX: `figma` (45), `accessibility`/a11y/wcag/aria (44), `design-systems` (48), `ux` (46), `ui` (47), `research` with alias "usability research" (69), `storybook` (49), `motion` (50). AI: `llm` (56), `rag` (57), `prompt-engineering` (59), `evaluation` (60), `embeddings` (58), `openai` (55).

Missing common terms:
- UX: **usability testing** / "usability" on its own (only "usability research" matches), wireframing, prototyping, user testing, interaction design, information architecture, journey mapping, Sketch, Adobe XD, design tokens, responsive design.
- AI: vector databases (pgvector, Pinecone), LangChain, LlamaIndex, fine-tuning, Hugging Face, Anthropic/Claude, Gemini, AI agents / tool calling, NLP, MLOps, guardrails.
- Dangling `related` references with no entry: `prototyping` (45), `design systems` as a string rather than the id `design-systems` (45, 47), `vector databases` (57), plus `jsx`, `nuxt`, `rxjs`, `vite`, `spring`, `grpc`, `cargo`, `asp.net`, `laravel`, `rails`, `postcss`, `lambda`, `s3`, `nosql`, `caching`, `github`, `e2e testing`, `collaboration`, `leadership`, `scale`.
- False-positive risk from over-broad aliases: `"evaluation"` (60, matches "performance evaluation"), `"research"` (69), `"go"` (11), `"ui"` (47), `"ml"` (51), `"release"` (68), `"optimization"` (64).

---

## 4. Findings

| ID | Sev | File:line | Evidence | Proposed fix | Phase |
|---|---|---|---|---|---|
| F-01 | P0 | `lib/tailor/wire.ts:10`, `stubs.ts:21-35` | all four G deps throw; analyze → `unavailable` (`pipeline.ts:91-92`) | implement `analyzeJob`, `detectGaps`, `pickProjects`, `checkDraft` behind the existing ports (`ports.ts:12-15`) and rewire `wire.ts`; until then, surface a distinct "not available yet" code instead of `unavailable` | B |
| F-02 | P0 | repo-wide (no `checkDraft`) | grep | real `checkDraft`: sentence-level check that every cited fact id is confirmed and that numbers and techs appear verbatim in the cited facts; remove-only (already enforced at `pipeline.ts:182`) | B |
| F-03 | P0 | `components/vault/project-list.tsx` (no confirm control) | J2 hop 5 | per-fact confirm/reject/edit UI for imported facts, saved through `PUT /api/vault/[id]` | C |
| F-04 | P0 | `app/vault/**`, `components/vault/**` | no `/tailor?id=` link; `tailor-flow.tsx:142` | add a "Tailor to a job" link, `/tailor?id=<vaultId>`, shown once ≥1 project has a confirmed fact | C |
| F-05 | P1 | `lib/tailor/pipeline.ts:77` | `detectGaps(analysis.data, input.vault)` gets the unfiltered vault | pass a confirmed-only view (as for picks, `pipeline.ts:70`), and test that an unconfirmed fact does not hide a gap | B |
| F-06 | P1 | the 11 routes in 3(d) | no `withGuards` | wrap the V3 routes and `vault/[id]` (separate limits); rate-limit `admin/metrics`; V1 frozen, but at minimum guard `deploy` and the Gemini routes, or disable them in production. V1 edits need an AGENTS.md override (ask first) | D |
| F-07 | P1 | `lib/rewrite/context.ts:112` | `techs: [...project.techs]` reaches the prompt without confirmation | drop `techs` from `RewriteContext`, or derive it only from confirmed `tech` facts | B |
| F-08 | P1 | `scripts/boundary-check.mjs:93` | single-line regex misses multi-line `fetch(` (e.g. `github-evidence.ts:125`) | match `fetch\s*\(` and read the first argument token; add a test fixture with a multi-line call | D |
| F-09 | P1 | `lib/job-match/report/store.ts:3` | in-memory Map on serverless | persist through the vault store (Upstash) with a TTL, or drop report-by-id | D |
| F-10 | P1 | `lib/job-match/github-evidence.ts:125` | raw fetch outside `safe-fetch` / `GITHUB_API` constant | route through the `GITHUB_API` constant / `lib/github.ts` | D |
| F-11 | P2 | `lib/rewrite/rewrite.ts:28,45` | fixed `BEGIN_CONTEXT_JSON` marker, no nonce | add a nonce like `resume.ts:103` and `questions/draft.ts:64` | B |
| F-12 | P2 | `.env.example:4` vs `llm/index.ts:20` | 10 s vs 30 s | set `.env.example` to 30000, or document why 10 s | D |
| F-13 | P2 | `.env.example:16-18`, `README.md:112,122` | `GITHUB_TOKEN` described as optional; job-match needs it (`github-evidence.ts:116-119,168`) | document "required for /job-match" | D |
| F-14 | P2 | `tsconfig.tsbuildinfo`, `docs/ci-pivot.patch`, `.gitignore` | files exist; no ignore rule | add `*.tsbuildinfo` to `.gitignore`, `git rm --cached` it, delete the patch (`.gitignore` edit needs permission) | D |
| F-15 | P2 | `lib/job-match/skills.json` | missing terms, dangling `related`, broad aliases (3k) | add the missing entries; fix dangling ids; narrow aliases | D |
| F-16 | P2 | `lib/tailor/pipeline.ts:74-90` | analyze output not re-parsed with Zod | `jobProfileSchema.safeParse(analysis.data)` before use (schema name UNVERIFIED) | B |

---

## 5. Unknowns (not determinable by reading what I read)

- Whether `tsconfig.tsbuildinfo` and `docs/ci-pivot.patch` are tracked in git (needs `git ls-files`).
- The exact `withGuards` behaviour (401 body, 429 body, beta header name) and whether `lib/tailor/client.ts` maps those codes to friendly messages. `guard.ts` was read earlier; lines not re-checked.
- Whether `/api/vault/[id]` has any ownership check beyond knowing the id.
- The repo-import cap of 6 and the deep-dive steps (J2 hops 1-2).
- The `recordApplication` hashing, storage and metrics aggregation details (J6).
- The add-fact flow in edit (J5 hop 4).
- Whether `lib/job-match/**` uses `lib/llm` or raw Gemini, and whether the posting is delimited there.
- Whether the malicious fixture persona is exercised against each prompt.
- The value of `UNAVAILABLE_MESSAGE`.
- Whether `JSON.stringify` is used for the rewrite context (affects F-11 severity).
- Runtime behaviour of everything above: no tests or commands were run.

---

## Appendix — files read

AGENTS.md, README.md, package.json, tsconfig.json, .env.example, .github/workflows/ci.yml, scripts/verify.mjs, scripts/boundary-check.mjs, .git/HEAD,
lib/schemas/{vault,job,draft,tailor}.ts,
lib/llm/{gemini,index,mock,structured,types}.ts,
lib/tailor/{wire,stubs,pipeline,ports,edit,http,record,requests,selection,client,limits}.ts,
lib/rewrite/{context,rewrite}.ts,
lib/vault/{ops,applications,index}.ts,
lib/ingest/{client,merge,resume}.ts,
lib/questions/{confirm,draft}.ts,
lib/security/guard.ts,
lib/job-match/{github-evidence.ts,skills.json,report/store.ts},
app/api/tailor/{analyze,generate,edit}/route.ts, app/api/vault/[id]/route.ts, app/api/import/{repos,resume}/route.ts, app/api/questions/draft/route.ts, app/api/admin/metrics/route.ts, app/api/job-match/route.ts,
app/tailor/page.tsx, app/vault/page.tsx,
components/tailor/tailor-flow.tsx, components/vault/{import-panel,project-list}.tsx.

Grep-only (matched lines seen, file not fully read): lib/upstash-store.ts (`lib/vault/upstash-store.ts`), lib/job-match/analyzer.ts, components/tailor/{results-view,removed-panel,job-step,editable-draft,analysis-review}.tsx, the remaining `app/api/**/route.ts` files listed in 3(d), tests/tailor/{record,pipeline,helpers,edit,edit-route}.test.ts, tests/job-match/job-match.test.ts, .gitignore.

**Not read (required by the brief, not opened):** lib/outputs/*, lib/metrics/*, the rest of lib/security/*, the rest of lib/job-match/*, the rest of lib/ingest/* and lib/vault/*, components/security/*, components/admin/*, app/admin/page.tsx, app/page.tsx, app/legacy/**, and most test bodies (security and vault tests not opened). Claims touching these are marked UNVERIFIED.

---

## Report format

**(a) Branch:** `integrate/end-to-end`

**(b) Files:** created `docs/audit/END_TO_END_AUDIT.md`. Changed: none. Deleted: none.

**(c) Acceptance criteria**

| Criterion | Proof |
|---|---|
| Report exists at `docs/audit/END_TO_END_AUDIT.md` | this file |
| Journeys J1–J7 traced hop by hop | §1 (many hops UNVERIFIED, as marked) |
| Three-version table | §2 |
| Blockers (a)–(k) verified | §3 |
| Findings table with severity and phase | §4 |
| Unknowns listed | §5 |
| Every claim cited | cited inline, or marked UNVERIFIED |
| Every brief file read | **NOT MET**, see "Not read" in the appendix |

**(d)** I did not run any commands. Exceptions: at the start of the session, before the read-only phase, I ran the branch checkout/push you asked for in your first message, and one `git branch --show-current` check. Committing this report goes through v0's Git sync, which pushes to `integrate/end-to-end`.

**(e) Commands to run locally**

```
git checkout integrate/end-to-end && git pull
git ls-files tsconfig.tsbuildinfo docs/ci-pivot.patch
pnpm install --frozen-lockfile
pnpm verify
node scripts/boundary-check.mjs
```

**(f) Decisions and uncertainties**

- I classified `project.techs` in the rewrite context (F-07) as P1, not P0, because the rewrite and checker can still drop the claim. If you treat any unconfirmed field in a prompt as a hard invariant breach, raise it to P0.
- F-06 recommends guarding V1 routes. AGENTS.md freezes V1, so that needs your explicit override.
- I did not open several required directories (appendix); a Phase A follow-up should close them before Phase B starts.
