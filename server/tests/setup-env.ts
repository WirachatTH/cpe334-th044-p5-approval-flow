import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Vitest does not read .env files. For local runs, copy server/.env.example to server/.env; this loads it into
// process.env without overriding anything already set (so CI and shells win). server/.env is git-ignored.
const file = path.resolve(import.meta.dirname, "../.env");
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}
