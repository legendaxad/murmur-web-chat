import mongoose from "mongoose";
import { env } from "./config/env";
import { createApp } from "./app";

/** Connect to the database first, then accept traffic (BURAK's server.ts pattern). */
async function main() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI);
  console.info("[db] connected");

  const server = createApp().listen(env.PORT, () => {
    console.info(`[http] listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.info(`[http] ${signal} received, shutting down`);
    server.close(() => {
      mongoose.connection.close().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[startup] failed:", (err as Error).message);
  process.exit(1);
});
