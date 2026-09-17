import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const excluded = new Set([".git", ".next", ".vinext", "dist", "node_modules", ".wrangler"]);
const allowed = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".sql", ".example", ""]);
const findings = [];
const patterns = [
  [/\b(?:sk|pat|ghp|gho|github_pat)_[A-Za-z0-9_\-]{20,}\b/g, "token-like value"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "private key"],
  [/(?:ETSY_SHARED_SECRET|ETSY_API_KEY|AUTH_SECRET)[ \t]*=[ \t]*[^\s#]+/g, "populated environment secret"],
  [/\b(?:access_token|refresh_token)\s*[:=]\s*["'][^"']+["']/gi, "hard-coded OAuth token"],
];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (allowed.has(extname(entry.name)) || entry.name === ".env.example") {
      const source = await readFile(path, "utf8").catch(() => "");
      for (const [pattern, label] of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(source)) findings.push(`${relative(new URL("..", import.meta.url).pathname, path)}: ${label}`);
      }
    }
  }
}

await walk(new URL("..", import.meta.url).pathname);
if (findings.length) { console.error(findings.join("\n")); process.exit(1); }
console.log("Secret scan passed: no credential-like values found.");
