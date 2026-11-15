import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";

// Helpers that run the project's own commands as separate processes, the way a person or Cloud Run would.

export const SERVER_DIR = path.resolve(import.meta.dirname, "../../..");
export const PRISMA_CLI = path.join(SERVER_DIR, "node_modules/prisma/build/index.js");
export const TSC_CLI = path.join(SERVER_DIR, "node_modules/typescript/bin/tsc");

// The variables the tests control. A child process must never inherit them by accident from the developer's shell
// or from server/.env.
//
// Importing @prisma/client loads server/.env into process.env, filling every variable that is not already
// defined, and a variable defined as an empty string counts as defined. So deleting a variable is not enough to
// make it "missing": a developer's real .env would fill it in, and a test would pass or fail depending on the
// machine. The variables whose empty value means "not set" are therefore blanked. PORT and NODE_ENV are deleted,
// because an empty value is invalid for them; every test that depends on them passes them explicitly.
const BLANKED = ["DATABASE_URL", "DEMO_USER_PASSWORD", "CLIENT_ORIGINS"];
const DELETED = ["PORT", "NODE_ENV"];

export function childEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of BLANKED) env[key] = "";
  for (const key of DELETED) delete env[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) env[key] = value;
  }
  return env;
}

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

// Runs `node <args>` in the server folder and waits for it to exit. A process still running after timeoutMs is
// killed and reported as timedOut, so a test can assert that a process ended by itself.
export function run(args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: SERVER_DIR, env });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

// A long-running process (the built server). Call stop() when the test is done.
export function start(args: string[], env: NodeJS.ProcessEnv): { child: ChildProcess; stop: () => void } {
  const child = spawn(process.execPath, args, { cwd: SERVER_DIR, env, stdio: "ignore" });
  return { child, stop: () => void child.kill() };
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

export async function waitForHttp(url: string, timeoutMs: number): Promise<Response | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return await fetch(url);
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return null;
}
