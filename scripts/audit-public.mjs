import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const ignored = new Set([".git", ".wrangler", "dist", "node_modules", ".pnpm-store"]);
const textExtensions = new Set(["", ".css", ".html", ".js", ".json", ".jsonc", ".md", ".mjs", ".sql", ".ts", ".tsx", ".txt", ".yaml", ".yml"]);
const findings = [];

const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["OpenAI-style secret", /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ["GitHub token", /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}\b/],
  ["authorization bearer", /authorization\s*[:=]\s*["']?bearer\s+[A-Za-z0-9._-]{12,}/i],
  ["non-empty secret assignment", /(?:api[_-]?token|api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password)\s*[:=]\s*["'][^"'\s]{8,}["']/i],
  ["personal filesystem path", /\/(?:Users|home)\/[^/\s]+\//]
];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!textExtensions.has(extname(entry.name))) continue;
    const content = await readFile(path, "utf8");
    for (const [label, pattern] of rules) {
      if (pattern.test(content)) findings.push(`${relative(root, path)}: ${label}`);
    }
  }
}

await walk(root);

if (findings.length) {
  console.error("Public-repository audit failed:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Public-repository audit passed: no credential patterns or personal filesystem paths found.");
