/**
 * CareVault k6 load test — Phase 6
 *
 * Scenarios:
 *   1. Health check (background baseline)
 *   2. Auth flow (login → bearer token → me)
 *   3. Patient search (authenticated, facility-scoped)
 *   4. Dashboard stats (authenticated)
 *
 * Usage:
 *   k6 run --env BASE_URL=http://your-alb-dns/api/v1 \
 *          --env ADMIN_EMAIL=admin@carevault.ng \
 *          --env ADMIN_PASSWORD=YourPassword \
 *          k6/load-test.js
 *
 * Target: 50 concurrent users, sustained 10 minutes (Phase 6 requirement)
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Custom metrics ────────────────────────────────────────────────────────────
const loginErrors   = new Rate("login_errors");
const searchErrors  = new Rate("patient_search_errors");
const loginLatency  = new Trend("login_latency_ms", true);
const searchLatency = new Trend("patient_search_latency_ms", true);

// ── Test config ───────────────────────────────────────────────────────────────
const BASE_URL       = __ENV.BASE_URL       || "http://localhost:4000/api/v1";
const ADMIN_EMAIL    = __ENV.ADMIN_EMAIL    || "admin@carevault.ng";
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || "Admin1234!";

export const options = {
  scenarios: {
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 50 },  // ramp up to 50 VUs
        { duration: "8m", target: 50 },  // hold at 50 VUs for 8 minutes
        { duration: "1m", target: 0  },  // ramp down
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    // 95th percentile response time under 1s for all requests
    http_req_duration:       ["p(95)<1000"],
    // Login 95th percentile under 2s (bcrypt is slow by design)
    login_latency_ms:        ["p(95)<2000"],
    // Patient search 95th percentile under 800ms
    patient_search_latency_ms: ["p(95)<800"],
    // Error rates under 1%
    login_errors:            ["rate<0.01"],
    patient_search_errors:   ["rate<0.01"],
    // HTTP error rate under 1%
    http_req_failed:         ["rate<0.01"],
  },
};

// ── Main VU script ────────────────────────────────────────────────────────────
export default function () {
  // 1. Login
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: { "Content-Type": "application/json" } },
  );
  loginLatency.add(Date.now() - loginStart);

  const loginOk = check(loginRes, {
    "login: status 200":         (r) => r.status === 200,
    "login: has accessToken":    (r) => !!r.json("accessToken"),
  });
  loginErrors.add(!loginOk);

  if (!loginOk) {
    sleep(1);
    return;
  }

  const token = loginRes.json("accessToken");
  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  sleep(0.5);

  // 2. Get current user profile
  const meRes = http.get(`${BASE_URL}/auth/me`, authHeaders);
  check(meRes, { "me: status 200": (r) => r.status === 200 });

  sleep(0.5);

  // 3. Patient search
  const searchStart = Date.now();
  const searchRes = http.get(`${BASE_URL}/patients?page=1&pageSize=20`, authHeaders);
  searchLatency.add(Date.now() - searchStart);

  const searchOk = check(searchRes, {
    "patients: status 200":   (r) => r.status === 200,
    "patients: has data key": (r) => Array.isArray(r.json("data")),
  });
  searchErrors.add(!searchOk);

  sleep(0.5);

  // 4. Dashboard stats
  const statsRes = http.get(`${BASE_URL}/dashboard/stats`, authHeaders);
  check(statsRes, { "dashboard: status 200": (r) => r.status === 200 });

  sleep(0.5);

  // 5. Health check
  const healthRes = http.get(BASE_URL.replace("/api/v1", "") + "/health");
  check(healthRes, {
    "health: status 200": (r) => r.status === 200,
    "health: db ok":      (r) => r.json("db") === "ok",
  });

  sleep(1);
}
