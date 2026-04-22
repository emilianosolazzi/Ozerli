/**
 * Centralized environment validation. Called once at startup; throws on
 * missing/invalid values so the process fails fast instead of booting in a
 * half-configured state.
 */

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  signingKeySecret: string | undefined;
  corsOrigins: string[];
  trustProxy: number | boolean;
  tier: "oss" | "paid";
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    throw new Error(`Invalid PORT value: "${raw}"`);
  }
  return n;
}

function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseTier(raw: string | undefined): "oss" | "paid" {
  if (raw === "paid") return "paid";
  return "oss";
}

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  const nodeEnvRaw = process.env.NODE_ENV ?? "development";
  if (
    nodeEnvRaw !== "development" &&
    nodeEnvRaw !== "test" &&
    nodeEnvRaw !== "production"
  ) {
    throw new Error(
      `Invalid NODE_ENV: "${nodeEnvRaw}" (expected development|test|production)`,
    );
  }
  const isProduction = nodeEnvRaw === "production";

  const port = parsePort(required("PORT"));
  const databaseUrl = required("DATABASE_URL");
  const sessionSecret = required("SESSION_SECRET");

  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
  const signingKeySecret = process.env.SIGNING_KEY_SECRET;

  if (isProduction) {
    if (corsOrigins.length === 0) {
      throw new Error(
        "CORS_ORIGIN is required in production (comma-separated allow-list)",
      );
    }
    if (!signingKeySecret || signingKeySecret.trim() === "") {
      throw new Error(
        "SIGNING_KEY_SECRET is required in production (used as KEK for signing key)",
      );
    }
    if (sessionSecret.length < 32) {
      throw new Error(
        "SESSION_SECRET must be at least 32 characters in production",
      );
    }
  }

  const trustProxyRaw = process.env.TRUST_PROXY;
  let trustProxy: number | boolean = 1;
  if (trustProxyRaw !== undefined) {
    const n = Number(trustProxyRaw);
    trustProxy = Number.isFinite(n) ? n : trustProxyRaw === "true";
  }

  cached = {
    nodeEnv: nodeEnvRaw,
    isProduction,
    port,
    databaseUrl,
    sessionSecret,
    signingKeySecret,
    corsOrigins,
    trustProxy,
    tier: parseTier(process.env.OZERLI_TIER),
  };
  return cached;
}

export function getConfig(): AppConfig {
  return loadConfig();
}
