import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../../src/config.js";

// F-05 §1.4: loadConfig(env) is a pure function of the environment. It returns the configuration or throws a
// ConfigError that names every problem and never contains a value.

const DB = "postgresql://app:app@localhost:5433/app";

function thrown(env: NodeJS.ProcessEnv): ConfigError {
  try {
    loadConfig(env);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return error as ConfigError;
  }
  return expect.fail(`loadConfig did not throw for an environment with only ${JSON.stringify(Object.keys(env))}`);
}

describe("loadConfig", () => {
  it.each(["development", "test"])(
    "TEST-F05-14 / AC-F05-14: DATABASE_URL unset throws, NODE_ENV=%s",
    (nodeEnv) => {
      expect(thrown({ NODE_ENV: nodeEnv }).message).toContain("config: DATABASE_URL is not set");
    },
  );

  it.each(["abc", "0", "65536", "3000abc", "80.5", "-1", ""])(
    "TEST-F05-15 / AC-F05-15: PORT=%j is refused",
    (port) => {
      const message = thrown({ DATABASE_URL: DB, PORT: port }).message;
      expect(message).toContain("config: PORT must be a port number");
      // The empty string is contained in every message, so the no-echo check is skipped for it.
      if (port !== "") expect(message).not.toContain(port);
    },
  );

  it("TEST-F05-15 / AC-F05-15: PORT unset gives 3000 and 4123 gives 4123", () => {
    expect(loadConfig({ DATABASE_URL: DB }).port).toBe(3000);
    expect(loadConfig({ DATABASE_URL: DB, PORT: "4123" }).port).toBe(4123);
  });

  it("TEST-F05-16 / AC-F05-16: NODE_ENV=staging is refused without echoing it; unset gives development", () => {
    const message = thrown({ DATABASE_URL: DB, NODE_ENV: "staging" }).message;
    expect(message).toContain("config: NODE_ENV must be development, test, or production");
    expect(message).not.toContain("staging");
    expect(loadConfig({ DATABASE_URL: DB }).nodeEnv).toBe("development");
  });

  it("TEST-F05-17 / AC-F05-17: CLIENT_ORIGINS defaults outside production, and entries are trimmed", () => {
    const base = { NODE_ENV: "development", DATABASE_URL: DB };
    expect(loadConfig(base).clientOrigins).toEqual(["http://localhost:5173"]);
    expect(
      loadConfig({ ...base, CLIENT_ORIGINS: " https://a.example , https://b.example " }).clientOrigins,
    ).toEqual(["https://a.example", "https://b.example"]);
  });

  describe("TEST-F05-18 / AC-F05-18: production", () => {
    it("(a) only CLIENT_ORIGINS missing names CLIENT_ORIGINS and not DATABASE_URL", () => {
      const message = thrown({ NODE_ENV: "production", DATABASE_URL: DB }).message;
      expect(message).toContain("CLIENT_ORIGINS");
      expect(message).not.toContain("DATABASE_URL");
    });

    it("(b) only DATABASE_URL missing names DATABASE_URL and not CLIENT_ORIGINS", () => {
      const message = thrown({ NODE_ENV: "production", CLIENT_ORIGINS: "https://a.example" }).message;
      expect(message).toContain("DATABASE_URL");
      expect(message).not.toContain("CLIENT_ORIGINS");
    });

    it("(c) a valid production configuration is returned", () => {
      const config = loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: DB,
        CLIENT_ORIGINS: "https://a.example",
        PORT: "8080",
      });
      expect(config).toMatchObject({ nodeEnv: "production", port: 8080, clientOrigins: ["https://a.example"] });
    });
  });

  it("TEST-F05-22 / AC-F05-22: CLIENT_DIST_DIR is null when unset or blank, and trimmed when set", () => {
    expect(loadConfig({ DATABASE_URL: DB }).clientDistDir).toBeNull();
    expect(loadConfig({ DATABASE_URL: DB, CLIENT_DIST_DIR: "" }).clientDistDir).toBeNull();
    expect(loadConfig({ DATABASE_URL: DB, CLIENT_DIST_DIR: "  /app/client/dist  " }).clientDistDir).toBe("/app/client/dist");
  });
});
