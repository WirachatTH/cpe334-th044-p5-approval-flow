// Configuration loader. The shape follows the F-05 contract §1.4 and §1.7: a pure function of the environment
// that returns the configuration or throws a ConfigError listing every problem.
//
// SCAFFOLD STUB (#8, chore commit): this version applies no validation and no trimming. The rules arrive in the
// F-05 implementation, after the failing tests that specify them.

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

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    nodeEnv: (env.NODE_ENV as NodeEnv | undefined) ?? "development",
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? "",
    clientOrigins: (env.CLIENT_ORIGINS ?? "http://localhost:5173").split(","),
  };
}
