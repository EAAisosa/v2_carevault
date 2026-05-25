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

  cronSecret: required("CRON_SECRET"),

  cors: {
    allowedOrigins: (process.env["ALLOWED_ORIGINS"] ?? "http://localhost:3000").split(","),
  },

  appUrl: process.env["APP_URL"] ?? "http://localhost:3000",

  isProd: process.env["NODE_ENV"] === "production",
  isDev: process.env["NODE_ENV"] === "development",
} as const;
