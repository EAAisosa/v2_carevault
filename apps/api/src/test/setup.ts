// Globally-stubbed env so config loading doesn't throw in tests that import
// modules transitively depending on `config`. Real integration tests can
// override per-test with vi.stubEnv.
process.env["NODE_ENV"] = "test";
process.env["JWT_SECRET"] = process.env["JWT_SECRET"] ?? "test-jwt-secret".padEnd(64, "x");
process.env["JWT_REFRESH_SECRET"] = process.env["JWT_REFRESH_SECRET"] ?? "test-refresh-secret".padEnd(64, "x");
process.env["CRON_SECRET"] = process.env["CRON_SECRET"] ?? "test-cron-secret";
process.env["DATABASE_URL"] = process.env["DATABASE_URL"] ?? "postgresql://postgres:test@localhost:5432/carevault_test";
process.env["ALLOWED_ORIGINS"] = process.env["ALLOWED_ORIGINS"] ?? "http://localhost:3000";
process.env["APP_URL"] = process.env["APP_URL"] ?? "http://localhost:3000";
// 32 raw bytes, base64-encoded — deterministic for tests so encrypted
// fixtures are reproducible.
process.env["ENCRYPTION_KEY"] = process.env["ENCRYPTION_KEY"] ?? Buffer.alloc(32, 1).toString("base64");
