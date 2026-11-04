# Job Match

Job Match accepts pasted job text or a public job URL and compares it with evidence from a required public GitHub username plus optional resume text.

The pipeline is deterministic and does not call an LLM:

1. Job text is cleaned and split into sections.
2. A local skill taxonomy identifies requirements, tiers, role type, and values.
3. GitHub repositories are fetched with one GraphQL request and normalized into evidence from languages, topics, descriptions, README text, manifests, Docker, and workflows.
4. Evidence is scored by source strength and recency. Results are cached in process memory for six hours, with the refresh button bypassing that cache.
5. Projects and requirements are ranked from exact evidence. No evidence is never reported as covered.

Run `pnpm dev` and open `/job-match`. The API is `POST /api/job-match` with `jobText` or `jobUrl`, required `githubUsername`, optional `resumeText`, and optional `refresh`. Set `GITHUB_TOKEN` on deployments to improve GitHub API rate limits; only public repositories are requested.
