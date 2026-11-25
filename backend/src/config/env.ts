import "dotenv/config";
import { z } from "zod";

/**
 * Single, validated source of configuration.
 * The process exits at startup if anything required is missing, instead of
 * failing later on the first request.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(7722),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
  SENDBIRD_APP_ID: z.string().min(1, "SENDBIRD_APP_ID is required"),
  SENDBIRD_API_TOKEN: z.string().min(1, "SENDBIRD_API_TOKEN is required"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SENDBIRD_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Only report variable names and rules, never values.
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const raw = parsed.data;

if (raw.JWT_SECRET.length < 32) {
  console.warn("[config] JWT_SECRET is shorter than 32 characters. Rotate it to a longer random value.");
}

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  clientOrigins: raw.CLIENT_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean),
};
