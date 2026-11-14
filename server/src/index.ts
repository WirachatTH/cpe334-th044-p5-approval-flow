import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { getPrisma } from "./prisma.js";

// Server entry point: the only server-runtime file that reads process.env, creates the real Prisma client, and
// (from the F-05 implementation on) exits on a configuration error.
const config = loadConfig(process.env);
const app = createApp({ prisma: getPrisma(), config });

app.listen(config.port, "0.0.0.0", () => {
  console.log(`server: listening on port ${config.port}`);
});
