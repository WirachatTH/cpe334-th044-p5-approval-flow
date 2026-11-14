// Configuration loader (F-05 contract §1.4 and §1.7): a pure function of the environment. It returns the
// configuration or throws one ConfigError that lists every problem, one per line. A message names the variable
// and never contains its value, so a mistyped secret is never echoed into a log.

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type NodeEnv = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  clientOrigins: string[];
}

const NODE_ENVS: readonly string[] = ["development", "test", "production"];
const DEFAULT_PORT = 3000;
const DEFAULT_CLIENT_ORIGINS = ["http://localhost:5173"];

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const problems: string[] = [];

  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  if (databaseUrl === "") problems.push("config: DATABASE_URL is not set");

  let nodeEnv: NodeEnv = "development";
  if (env.NODE_ENV !== undefined) {
    if (NODE_ENVS.includes(env.NODE_ENV)) nodeEnv = env.NODE_ENV as NodeEnv;
    else problems.push("config: NODE_ENV must be development, test, or production");
  }

  let port = DEFAULT_PORT;
  if (env.PORT !== undefined) {
    // Only digits are accepted, so parseInt-style partial parsing ("3000abc", "80.5", "-1") is refused.
    const valid = /^[0-9]+$/.test(env.PORT) && Number(env.PORT) >= 1 && Number(env.PORT) <= 65535;
    if (valid) port = Number(env.PORT);
    else problems.push("config: PORT must be a port number");
  }

  const origins = (env.CLIENT_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
  let clientOrigins = origins;
  if (origins.length === 0) {
    if (env.NODE_ENV === "production") problems.push("config: CLIENT_ORIGINS is required in production");
    else clientOrigins = DEFAULT_CLIENT_ORIGINS;
  }

  if (problems.length > 0) throw new ConfigError(problems.join("\n"));
  return { nodeEnv, port, databaseUrl, clientOrigins };
}
