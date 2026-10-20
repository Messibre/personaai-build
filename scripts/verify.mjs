#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const steps = [
  { name: "Lint", command: "pnpm", args: ["lint"] },
  { name: "TypeScript Check", command: "pnpm", args: ["typecheck"] },
  { name: "Unit & Security Tests", command: "pnpm", args: ["test"] },
  { name: "Boundary Check", command: "node", args: ["scripts/boundary-check.mjs"] },
];

console.log("\x1b[1m\x1b[36m=== Running PersonaAI Verification Suite (pnpm verify) ===\x1b[0m\n");

const startTime = Date.now();

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const stepNum = `[${i + 1}/${steps.length}]`;
  console.log(`\x1b[34m${stepNum} Running ${step.name}...\x1b[0m`);

  const stepStart = Date.now();
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: true,
  });
  const duration = ((Date.now() - stepStart) / 1000).toFixed(1);

  if (result.status !== 0) {
    console.error(`\n\x1b[31m✖ ${step.name} failed with exit code ${result.status} (${duration}s)\x1b[0m\n`);
    process.exit(result.status || 1);
  }

  console.log(`\x1b[32m✔ ${step.name} passed (${duration}s)\x1b[0m\n`);
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\x1b[1m\x1b[32m✔ All verification steps passed successfully in ${totalDuration}s!\x1b[0m\n`);
process.exit(0);
