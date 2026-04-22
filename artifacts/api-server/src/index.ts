import app from "./app";
import { logger } from "./lib/logger";
import { initSigningKey } from "./lib/crypto";
import { loadConfig } from "./lib/config";
import { pool } from "@workspace/db";

const config = loadConfig();

async function main(): Promise<void> {
  const key = await initSigningKey();
  logger.info({ signingKeyId: key.id, nodeEnv: config.nodeEnv, tier: config.tier }, "Signing key loaded");

  const server = app.listen(config.port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port: config.port }, "Server listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close((err) => {
      if (err) logger.error({ err }, "Error closing HTTP server");
      pool
        .end()
        .catch((e) => logger.error({ err: e }, "Error closing DB pool"))
        .finally(() => process.exit(err ? 1 : 0));
    });
    // Hard timeout fallback
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandledRejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
