import { createApp } from "./app.js";
import { ConfigError, loadConfig, type AppConfig } from "./config.js";
import { getPrisma } from "./prisma.js";

// Server entry point: the only server-runtime file that reads process.env, creates the real Prisma client, and
// calls process.exit (F-05 §1.7). A configuration error is printed and the process exits with code 1 before a
// port is opened (AC-F05-11). That includes the error of createApp for an unusable CLIENT_DIST_DIR (AC-F05-27).
function orExit<T>(build: () => T): T | null {
  try {
    return build();
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    // Exit from the write callback so the message is flushed first.
    process.stderr.write(`${error.message}\n`, () => process.exit(1));
    return null;
  }
}

const config: AppConfig | null = orExit(() => loadConfig(process.env));
const app = config ? orExit(() => createApp({ prisma: getPrisma(), config })) : null;
if (config && app) {
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`server: listening on port ${config.port}`);
  });
}
