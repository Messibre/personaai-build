import fs from "node:fs"
import path from "node:path"
import type { GitHubProfile, GitHubRepo } from "../../lib/types"

import alexChenGitHub from "./alex-chen/github.json"
import priyaPatelGitHub from "./priya-patel/github.json"
import marcusVanceGitHub from "./marcus-vance/github.json"
import maliciousGitHub from "./malicious/github.json"

export type PersonaId = "alex-chen" | "priya-patel" | "marcus-vance" | "malicious"

export interface PersonaGitHubData {
  profile: GitHubProfile
  repos: GitHubRepo[]
}

export interface PersonaFixture {
  id: PersonaId
  name: string
  github: PersonaGitHubData
  resumeText: string
  notionContent: string
}

function readTextFile(personaDir: string, filename: string): string {
  try {
    const fullPath = path.join(__dirname, personaDir, filename)
    return fs.readFileSync(fullPath, "utf-8").trim()
  } catch {
    // Fallback using process.cwd() if __dirname is transformed by bundlers
    const fallbackPath = path.join(process.cwd(), "fixtures", "personas", personaDir, filename)
    return fs.readFileSync(fallbackPath, "utf-8").trim()
  }
}

export const alexChenPersona: PersonaFixture = {
  id: "alex-chen",
  name: "Alex Chen",
  github: alexChenGitHub,
  resumeText: readTextFile("alex-chen", "resume.txt"),
  notionContent: readTextFile("alex-chen", "notion.md"),
}

export const priyaPatelPersona: PersonaFixture = {
  id: "priya-patel",
  name: "Priya Patel",
  github: priyaPatelGitHub,
  resumeText: readTextFile("priya-patel", "resume.txt"),
  notionContent: readTextFile("priya-patel", "notion.md"),
}

export const marcusVancePersona: PersonaFixture = {
  id: "marcus-vance",
  name: "Marcus Vance",
  github: marcusVanceGitHub,
  resumeText: readTextFile("marcus-vance", "resume.txt"),
  notionContent: readTextFile("marcus-vance", "notion.md"),
}

export const maliciousPersona: PersonaFixture = {
  id: "malicious",
  name: "Eve Attacker (Malicious)",
  github: maliciousGitHub,
  resumeText: readTextFile("malicious", "resume.txt"),
  notionContent: readTextFile("malicious", "notion.md"),
}

export const personas: Record<PersonaId, PersonaFixture> = {
  "alex-chen": alexChenPersona,
  "priya-patel": priyaPatelPersona,
  "marcus-vance": marcusVancePersona,
  malicious: maliciousPersona,
}

export function getPersona(id: PersonaId): PersonaFixture {
  const persona = personas[id]
  if (!persona) {
    throw new Error(`Unknown persona id: ${id}`)
  }
  return persona
}
