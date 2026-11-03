# Job Match

Job Match accepts pasted job text or a public job URL, validates a structured analysis with the existing Gemini client, and compares requirements against GitHub repository metadata/README evidence and supplied resume text. Matching is deterministic: a requirement is only `covered` when a real project or resume line contains the requirement or one of its extracted synonyms.

Run the app with `pnpm dev`, then open `/job-match`. The API is `POST /api/job-match` with `jobText` or `jobUrl`, plus optional `githubUsername` and `resumeText`. The existing repository has no authentication/session persistence layer, so these source fields are supplied by the page rather than inferred.
