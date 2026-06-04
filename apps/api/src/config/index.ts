import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const config = {
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  port: parseInt(process.env["PORT"] ?? "4000", 10),

  db: {
    url: required("DATABASE_URL"),
  },

  jwtSecret: required("JWT_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),

  // 32 raw bytes (base64-encoded) used by lib/crypto.ts for AES-256-GCM.
  // Generate one with: openssl rand -base64 32
  encryptionKey: required("ENCRYPTION_KEY"),

  cronSecret: required("CRON_SECRET"),

  cors: {
    allowedOrigins: (process.env["ALLOWED_ORIGINS"] ?? "http://localhost:3000")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  appUrl: process.env["APP_URL"] ?? "http://localhost:3000",

  // Resend API key — get one free at resend.com
  // Leave blank in dev; emails will be logged to stdout instead.
  resendApiKey: process.env["RESEND_API_KEY"] ?? "",
  emailFrom: process.env["EMAIL_FROM"] ?? "noreply@carevaultng.com",

  isProd: process.env["NODE_ENV"] === "production",
  isDev: process.env["NODE_ENV"] === "development",
} as const;
