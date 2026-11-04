import type {
  EnrichedGitHubRepo,
  GitHubProfile,
  GitHubRepo,
  AIProject,
  AIGeneratedContentWithResume,
} from "@/lib/types";
import { enrichReposForAI } from "@/lib/github";
import { getLLMClient } from "@/lib/llm";
import * as cheerio from "cheerio";

// One slow Gemini call plus a single non-JSON retry must fit inside the function limit.
export const maxDuration = 90;

interface AIContentRequest {
  targetRole: string;
  externalLinks: string[];
  github: {
    profile: GitHubProfile | null;
    repos: GitHubRepo[];
  };
  resumeText: string | null;
  notionContent: string | null;
  additionalPrompt?: string;
  debug?: boolean;
}

interface GeminiAttemptDebug {
  keyIndex: number;
  status?: number;
  durationMs: number;
  ok: boolean;
  textLength: number;
  error?: string;
}

function isGeminiRetryWorthwhile(attempts: GeminiAttemptDebug[]): boolean {
  if (attempts.length === 0) return true;
  return !attempts.some(
    (attempt) =>
      attempt.status === 429 || /timeout|aborted/i.test(attempt.error || ""),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Allowed domains for scraping (security: avoid SSRF)
export const ALLOWED_DOMAINS = [
  "linkedin.com",
  "github.com",
  "medium.com",
  "dev.to",
  "hashnode.dev",
  "substack.com",
  "notion.so",
  "notion.site",
  "twitter.com",
  "x.com",
  "vercel.app",
];

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(
      (domain) => host === domain || host.endsWith("." + domain),
    );
  } catch {
    return false;
  }
}

// Scrape text content from a URL
async function scrapeUrlOnce(url: string): Promise<string> {
  if (!isAllowedUrl(url)) {
    return ""; // Silently skip disallowed URLs
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "PersonaAI-Bot/1.0 (Portfolio Generator; +https://personaai.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return "";

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer, etc.
    $("script, style, nav, footer, header, aside, iframe, noscript").remove();

    // Extract meaningful text
    const title = $("title").text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const ogDesc = $('meta[property="og:description"]').attr("content") || "";

    // Get main content
    const mainContent =
      $("main").text() ||
      $("article").text() ||
      $('[role="main"]').text() ||
      $(".content").text() ||
      $("body").text();

    // Clean and truncate
    const text = [title, metaDesc, ogDesc, mainContent]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 2000);

    return text;
  } catch {
    return "";
  }
}

async function scrapeUrl(url: string): Promise<string> {
  // Single attempt only — retries add too much latency for a best-effort signal
  return scrapeUrlOnce(url);
}

// Call Gemini API through unified LLMClient
async function callGemini(
  prompt: string,
  systemPrompt: string,
  expectJson = false,
): Promise<{ text: string | null; attempts: GeminiAttemptDebug[]; isConfigured: boolean }> {
  const client = getLLMClient();
  const startedAt = Date.now();
  const result = await client.generate({
    system: systemPrompt,
    prompt,
    maxOutputTokens: 4096,
    responseMimeType: expectJson ? "application/json" : undefined,
  });
  const durationMs = Date.now() - startedAt;

  if (result.ok) {
    const text = result.text.trim();
    return {
      text: text.length > 10 ? text : null,
      attempts: [
        {
          keyIndex: 0,
          status: 200,
          durationMs,
          ok: text.length > 10,
          textLength: text.length,
        },
      ],
      isConfigured: true,
    };
  }

  const isConfigError = result.error.kind === "config";
  const status =
    result.error.kind === "rate_limited"
      ? 429
      : result.error.kind === "bad_request"
        ? 400
        : isConfigError
          ? 401
          : 503;

  return {
    text: null,
    attempts: [
      {
        keyIndex: 0,
        status,
        durationMs,
        ok: false,
        textLength: 0,
        error: "message" in result.error ? result.error.message : result.error.kind,
      },
    ],
    isConfigured: !isConfigError,
  };
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, index + 1);
      }
    }
  }

  return null;
}

const MAX_BODY_BYTES = 1_048_576; // ~1 MB

export async function POST(request: Request) {
  try {
    const requestStartedAt = Date.now();

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }

    let data: AIContentRequest;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const {
      targetRole,
      externalLinks = [],
      github = { profile: null, repos: [] },
      resumeText = null,
      notionContent = null,
      additionalPrompt,
    } = data;

    // targetRole is optional — if missing, AI generates based on repos/links alone
    const resolvedRole = targetRole?.trim() || "Software Developer";

    // Step 1: Scrape external links in parallel (max 3 — keep total latency low)
    const scrapeStartedAt = Date.now();
    const linksToScrape = externalLinks.slice(0, 3);
    const scrapedTexts = await Promise.all(linksToScrape.map(scrapeUrl));
    const scrapedContent = scrapedTexts
      .filter(Boolean)
      .join("\n\n")
      .substring(0, 4000);
    const scrapeDurationMs = Date.now() - scrapeStartedAt;

    // Step 2: Prepare repo data for AI
    const reposStartedAt = Date.now();
    const reposForAI: EnrichedGitHubRepo[] = github.profile?.username
      ? await enrichReposForAI(github.profile.username, github.repos || [])
      : (github.repos || [])
          .filter((r) => !r.fork)
          .slice(0, 20)
          .map((r) => ({
            ...r,
            readmeText: "",
            detectedTech: "",
          }));
    const reposDurationMs = Date.now() - reposStartedAt;

    const name = github.profile?.name || github.profile?.username || "User";
    const debugMode = Boolean((data as any)?.debug);

    // Step 3: Single Gemini call — personality-first approach
    // The scraped content is the PRIMARY signal for voice, tone, and personality.
    // Generic career bios are the failure mode we are explicitly avoiding.
    const systemPrompt = `You are a career copywriter who turns a candidate’s raw background into a human, professional portfolio narrative.

  Write the following for a portfolio website:

  1. About Me (3-4 sentences, first person):
    - Sound like a real person — warm, professional, and to the point.
    - Speak as the candidate using "I" / "my" / "me".
    - Highlight specific skills, technologies, or projects that define the candidate.
    - Frame the story around the target role; explain why they’re a great fit, not just what they’ve done.
    - Use plain English. If a 14-year-old wouldn’t understand a term, rephrase it.
    - Avoid empty buzzwords ("passionate", "dedicated") unless tied to a concrete achievement.

  2. Project descriptions (1-2 sentences per project):
    - Base them primarily on the project’s README or technical details, never on generic placeholders.
    - Say clearly what the project does, the core technology, and the real-world value.
    - For projects related to the target role, subtly connect them to the role’s requirements.
    - Use active voice and short, crisp sentences.

  3. Hero tagline (max 10 words):
    - A memorable, natural one-liner that captures the candidate’s professional identity.
    - e.g., “Full-stack developer building fast, accessible web apps.”

  Tone rules for everything you write:
  - Professional ≠ robotic. A human should enjoy reading it.
  - Specificity beats superlatives. Show what was done, don’t just call it amazing.
  - Simple language wins. Replace jargon with everyday words when possible.
  - If the candidate’s own writing (blog posts, LinkedIn, etc.) reveals a personal style, mirror it subtly.

  Return valid JSON only. No markdown. No code fences. No explanation outside the JSON.`;

    const userPrompt = `You are building portfolio copy for ${name}, who is targeting the role: "${resolvedRole}".

  Use the system instructions exactly. The output must feel human, specific, and useful. Never default to generic summaries when the evidence supports a richer answer.

--- PERSONALITY SIGNALS (most important) ---
Read the content below carefully. Extract:
- Their writing style (casual? precise? humorous? blunt?)
- Recurring themes or interests (what do they keep coming back to?)
- Any strong opinions or stances they have
- How they describe their own work
- Their apparent values (speed, craft, open source, UX, etc.)
- Specific problems they seem to like solving
- The level of ambition in their work (small utilities, prototypes, production systems, research, infrastructure, etc.)
- Any repeated phrases, vocabulary, or tone cues that should influence the copy

Scraped from their links (LinkedIn, blog, Substack, etc.):
${scrapedContent || "None provided — rely on repos and resume instead."}

--- SUPPORTING SIGNALS ---
GitHub repos:
${JSON.stringify(
  reposForAI.map((r) => ({
    name: r.name,
    description: r.description || "",
    language: r.language || "",
    topics: r.topics || [],
    readmeText: (r.readmeText || "").substring(0, 500),
    detectedTech: r.detectedTech || "",
    stars: r.stargazers_count,
    forks: r.forks_count,
    url: r.html_url,
  })),
  null,
  2,
)}

Resume excerpt:
${resumeText?.substring(0, 1500) || "None"}

Notion content:
${notionContent?.substring(0, 1000) || "None"}

Additional instructions from the person:
${additionalPrompt || "None"}

--- QUALITY BAR ---
Write like you actually understand the person, not like you are filling a template.
Use concrete nouns, specific technologies, and real project details whenever possible.
Prefer phrasing that shows judgment, tradeoffs, or problem solving.
If the evidence is thin, make careful, grounded inferences instead of generic statements.

--- YOUR TASKS ---

1. PROJECT SELECTION & DESCRIPTIONS
   Pick up to 7 repos most relevant to "${resolvedRole}".
  For each, write a 2-4 sentence description that:
   - Highlights its relevance to the target role
  - Explains the problem it solves, the approach used, and why it matters
  - Uses language and framing consistent with how THIS PERSON talks about their work
  - Avoids generic phrases like "a full-stack app" or "built with React"
  - Includes at least one concrete detail from the README, repo description, detected tech, or scraped writing
  - If possible, mention scope, constraints, or impact (speed, reliability, simplicity, automation, maintainability, etc.)

2. ABOUT ME (3-4 sentences, first person)
  This is the most important field. Rules:
  - Mirror their actual writing style and tone from the scraped content
  - Make it feel grounded, intelligent, and human
  - Write in first person with natural confidence
  - Include 2-3 specific details across projects, technologies, or opinions
  - Show what problems they solve, not just what tools they use
  - Mention their likely strengths: judgment, speed, clarity, systems thinking, or craft
  - Do NOT use these banned phrases: "passionate about", "driven by", "dedicated to", "strong background in", "results-oriented", "leverages"
  - Sound like a person wrote this at 11pm, not a recruiter at 9am
  - It should read as a strong portfolio bio, not a placeholder summary

3. HERO TAGLINE (max 10 words, first person or noun phrase)
  Should feel like something this specific person would actually say.
  It should be specific, grounded, and memorable.
  Avoid: "Building the future", "Crafting experiences", "Turning ideas into reality", "Backend Developer — X"

4. WRITING STYLE
  Use simple English, but not childish English.
  Prefer concise sentences with punch.
  Vary sentence length so the copy feels natural.
  Do not repeat the same adjective across multiple projects.
  Make the descriptions feel like they were written by someone who built the thing, not someone summarizing it from a database.

5. OUTPUT DEPTH
  The about me section should feel complete and confident, not thin or placeholder-like.
  The project descriptions should sound like mini case studies, not labels.
  If the source material is strong, lean into concrete details and problem solving.

Return JSON in exactly this format:
{
  "projects": [
    {"name": "repo-name", "url": "https://github.com/...", "language": "JavaScript", "description": "...", "stars": 10, "forks": 2}
  ],
  "aboutMe": "...",
  "heroTagline": "..."
}`;

    const geminiStartedAt = Date.now();
    const geminiResult = await callGemini(userPrompt, systemPrompt, true);
    let aiResponse = geminiResult.text;
    const geminiDurationMs = Date.now() - geminiStartedAt;

    if (
      !aiResponse &&
      geminiResult.isConfigured &&
      isGeminiRetryWorthwhile(geminiResult.attempts)
    ) {
      const fallbackResult = await callGemini(userPrompt, systemPrompt, false);
      aiResponse = fallbackResult.text;
      geminiResult.attempts.push(...fallbackResult.attempts);
    }

    if (!aiResponse) {
      const fallbackProjects = buildFallbackProjects(reposForAI)
      const baseFallback = {
        projects: fallbackProjects,
        aboutMe: buildFallbackAboutMe(github.profile, github.repos || [], resolvedRole),
        heroTagline: buildFallbackTagline(github.profile, github.repos || [], resolvedRole),
      }

      if (debugMode) {
        const geminiQuotaOrTimeout = geminiResult.attempts.some(
          (attempt) =>
            attempt.status === 429 ||
            /timeout|aborted/i.test(attempt.error || ""),
        );
        return Response.json({
          ...baseFallback,
          debug: {
            geminiConfigured: geminiResult.isConfigured,
            reason: geminiQuotaOrTimeout
              ? "gemini_rate_limited_or_timed_out"
              : "aiResponse_missing_or_empty",
            timings: {
              totalMs: Date.now() - requestStartedAt,
              scrapeMs: scrapeDurationMs,
              reposMs: reposDurationMs,
              geminiMs: geminiDurationMs,
            },
            scrapedContentLength: scrapedContent.length,
            reposCount: reposForAI.length,
            reposWithReadme: reposForAI.filter(
              (r) => (r as any).readmeText && (r as any).readmeText.length > 0,
            ).length,
            aiRaw: null,
            geminiAttempts: geminiResult.attempts,
          },
        });
      }

      return Response.json(baseFallback);
    }

    // Parse AI response — strip markdown fences if Gemini wrapped the JSON
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    }

    const extractedJson = extractJsonObject(cleanedResponse);
    if (extractedJson) {
      cleanedResponse = extractedJson;
    }

    try {
      const parsed = JSON.parse(
        cleanedResponse,
      ) as AIGeneratedContentWithResume;

      // Validate and sanitize
      const projects: AIProject[] = (parsed.projects || [])
        .slice(0, 7)
        .map((p) => ({
          name: p.name || "Project",
          url: p.url || "#",
          language: p.language || null,
          description:
            p.description || "Open-source project. View on GitHub for details.",
          stars: typeof p.stars === "number" ? p.stars : 0,
          forks: typeof p.forks === "number" ? p.forks : 0,
        }));

      const base = {
        projects,
        aboutMe:
          parsed.aboutMe ||
          `${name} is a ${resolvedRole} with diverse technical experience.`,
        heroTagline: parsed.heroTagline || resolvedRole,
      };

      // If resume text was provided but AI did not return a resume section, synthesize a light summary
      let final = { ...base } as any;
      if (resumeText && !parsed.resume) {
        const synthSummary = synthesizeResumeSummary(resumeText);
        final.resume = {
          summary: synthSummary.summary,
          highlights: synthSummary.highlights,
        };
      } else if (parsed.resume) {
        final.resume = parsed.resume;
      }

      if (debugMode) {
        return Response.json({
          ...final,
          debug: {
            geminiConfigured: geminiResult.isConfigured,
            reason: "aiResponse_parsed",
            timings: {
              totalMs: Date.now() - requestStartedAt,
              scrapeMs: scrapeDurationMs,
              reposMs: reposDurationMs,
              geminiMs: geminiDurationMs,
            },
            scrapedContentLength: scrapedContent.length,
            reposCount: reposForAI.length,
            reposWithReadme: reposForAI.filter(
              (r) => (r as any).readmeText && (r as any).readmeText.length > 0,
            ).length,
            aiRaw: aiResponse?.substring(0, 2000) || null,
            extractedJsonLength: extractedJson?.length || 0,
            geminiAttempts: geminiResult.attempts,
          },
        });
      }

      return Response.json(final);
    } catch {
      // JSON parse failed, return real-feeling fallback
      const base2 = {
        projects: buildFallbackProjects(reposForAI),
        aboutMe: buildFallbackAboutMe(github.profile, github.repos || [], resolvedRole),
        heroTagline: buildFallbackTagline(github.profile, github.repos || [], resolvedRole),
      }

      // If parsing failed, but resume text exists, synthesize a small resume summary to include
      if (debugMode) {
        const geminiQuotaOrTimeout = geminiResult.attempts.some(
          (attempt) =>
            attempt.status === 429 ||
            /timeout|aborted/i.test(attempt.error || ""),
        );
        const synth = resumeText ? synthesizeResumeSummary(resumeText) : null;
        return Response.json({
          ...base2,
          resume: synth || undefined,
          debug: {
            geminiConfigured: geminiResult.isConfigured,
            reason: geminiQuotaOrTimeout
              ? "gemini_rate_limited_or_timed_out"
              : "aiResponse_parse_error",
            timings: {
              totalMs: Date.now() - requestStartedAt,
              scrapeMs: scrapeDurationMs,
              reposMs: reposDurationMs,
              geminiMs: geminiDurationMs,
            },
            scrapedContentLength: scrapedContent.length,
            reposCount: reposForAI.length,
            reposWithReadme: reposForAI.filter(
              (r) => (r as any).readmeText && (r as any).readmeText.length > 0,
            ).length,
            aiRaw: aiResponse?.substring(0, 2000) || null,
            extractedJsonLength: extractedJson?.length || 0,
            geminiAttempts: geminiResult.attempts,
          },
        });
      }

      const synth2 = resumeText ? synthesizeResumeSummary(resumeText) : null;
      return Response.json({ ...base2, resume: synth2 || undefined });
    }
  } catch (err) {
    const traceId = crypto.randomUUID();
    console.error(`[ai-content] error [${traceId}]:`, err);
    return Response.json(
      { error: "Something went wrong", traceId },
      { status: 500 }
    );
  }
}

/** Build real-feeling project descriptions from enriched GitHub repo data. */
function buildFallbackProjects(repos: EnrichedGitHubRepo[]): AIProject[] {
  return repos.slice(0, 7).map((r) => {
    const lang = r.language || null
    const topics = (r.topics || []).slice(0, 3)
    const desc = r.description?.trim()
    const readme = r.readmeText?.trim()
    const tech = r.detectedTech?.trim()

    let text: string

    if (desc && desc.length > 20) {
      // Real GitHub description — enrich with tech/topics if the desc is short
      text = desc.endsWith(".") ? desc : `${desc}.`
      const extras = [tech || lang, ...topics].filter(Boolean)
      if (desc.length < 60 && extras.length > 0) {
        text += ` Built with ${extras.slice(0, 3).join(", ")}.`
      }
    } else if (readme && readme.length > 40) {
      // Pull the first meaningful sentence from the README
      const firstSentence = readme.replace(/[#*`]/g, "").split(/[.!?]/)[0]?.trim()
      text = firstSentence && firstSentence.length > 15
        ? `${firstSentence}.${lang ? ` Written in ${lang}.` : ""}`
        : `${lang || "Software"} project.${topics.length ? ` Covers ${topics.slice(0, 2).join(" and ")}.` : ""}`
    } else if (topics.length >= 2) {
      text = `A ${lang || "software"} project covering ${topics.slice(0, 2).join(" and ")}${topics[2] ? ` and ${topics[2]}` : ""}.`
      if (r.stargazers_count > 0) text += ` Has ${r.stargazers_count} stars on GitHub.`
    } else if (tech || lang) {
      text = `An open-source ${tech || lang} project${topics.length ? ` focused on ${topics[0]}` : ""}. See the full source on GitHub.`
    } else {
      text = "An open-source project. View the full source and documentation on GitHub."
    }

    return {
      name: r.name,
      url: r.html_url,
      language: lang,
      description: text,
      stars: r.stargazers_count,
      forks: r.forks_count,
    }
  })
}

/** Build a real-feeling about-me from profile fields when Gemini is unavailable. */
function buildFallbackAboutMe(profile: GitHubProfile | null, repos: GitHubRepo[], targetRole: string): string {
  if (!profile) return `A software developer targeting ${targetRole} roles.`

  const name = profile.name || profile.username
  const langs = [...new Set(repos.filter((r) => !r.fork && r.language).map((r) => r.language as string))].slice(0, 3)
  const topRepo = repos.filter((r) => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count)[0]
  const repoCount = profile.public_repos || repos.length

  if (profile.bio && profile.bio.length > 30) {
    return `${profile.bio.endsWith(".") ? profile.bio : `${profile.bio}.`}${langs.length ? ` I primarily work in ${langs.join(", ")}.` : ""}${topRepo && topRepo.stargazers_count > 1 ? ` My most-starred project is ${topRepo.name} with ${topRepo.stargazers_count} stars.` : ""}`
  }

  const facts = [
    `I'm ${name}, a developer targeting ${targetRole} roles${repoCount ? ` with ${repoCount} public repositories on GitHub` : ""}.`,
    langs.length ? `Most of my work is in ${langs.join(", ")}.` : "",
    topRepo ? `My most-starred project is ${topRepo.name}${topRepo.stargazers_count > 0 ? ` (${topRepo.stargazers_count} stars)` : ""}.` : "",
  ]
  return facts.filter(Boolean).join(" ")
}

/** Build a real-feeling hero tagline. */
function buildFallbackTagline(profile: GitHubProfile | null, repos: GitHubRepo[], targetRole: string): string {
  const langs = [...new Set(repos.filter((r) => !r.fork && r.language).map((r) => r.language as string))].slice(0, 2)
  return `${targetRole}${langs.length ? ` · ${langs.join(" & ")}` : ""}`
}

// Lightweight resume summarizer (used when AI doesn't return a resume section)
function synthesizeResumeSummary(resumeText: string) {
  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  // Try to pick bullets if present
  const bullets = lines
    .filter((l) => /^[\-•*]\s+/.test(l))
    .slice(0, 6)
    .map((l) => l.replace(/^[\-•*]\s+/, ""));
  const highlights =
    bullets.length >= 3 ? bullets.slice(0, 3) : lines.slice(0, 6).slice(0, 3);
  const summary = lines.slice(0, 6).join(" ").substring(0, 600);
  return { summary, highlights };
}
