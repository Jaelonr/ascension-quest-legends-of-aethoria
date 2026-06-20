import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const requiredSecrets = [
  "DATABASE_URL",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "VITE_CLERK_PUBLISHABLE_KEY",
];

const productionFalseFlags = [
  "DEV_MOCK_API",
  "DEV_AUTH_BYPASS",
  "VITE_DEV_AUTH_BYPASS",
];

const browserRoutes = [
  "/guild-hall",
  "/training",
  "/nutrition",
  "/chronicle",
  "/character",
  "/inventory?tab=armory",
  "/settings",
];

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

function envCheck(): CheckResult[] {
  const results: CheckResult[] = [];
  for (const key of requiredSecrets) {
    results.push({
      name: `env:${key}`,
      ok: Boolean(process.env[key]?.trim()),
      detail: process.env[key]?.trim() ? "set" : "missing",
    });
  }
  for (const key of productionFalseFlags) {
    const value = process.env[key];
    results.push({
      name: `env:${key}`,
      ok: value === "false",
      detail: value == null ? "missing; set to false in production" : `value=${value}`,
    });
  }
  results.push({
    name: "env:VITE_CLERK_PROXY_URL",
    ok: (process.env.VITE_CLERK_PROXY_URL ?? "/api/__clerk") === "/api/__clerk",
    detail: `value=${process.env.VITE_CLERK_PROXY_URL ?? "/api/__clerk"}`,
  });
  return results;
}

function requestStatus(url: string): Promise<CheckResult> {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === "https:" ? https : http;
    const req = transport.request(parsed, { method: "GET", timeout: 8000 }, (res) => {
      res.resume();
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        resolve({
          name: `route:${parsed.pathname}${parsed.search}`,
          ok: status >= 200 && status < 400,
          detail: `status=${status}`,
        });
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("request timed out"));
    });
    req.on("error", (error) => {
      resolve({
        name: `route:${parsed.pathname}${parsed.search}`,
        ok: false,
        detail: error.message,
      });
    });
    req.end();
  });
}

async function routeChecks(baseUrl: string): Promise<CheckResult[]> {
  const root = baseUrl.replace(/\/$/, "");
  const routes = ["/api/healthz", ...browserRoutes];
  return Promise.all(routes.map((route) => requestStatus(`${root}${route}`)));
}

function printResults(results: CheckResult[]) {
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    console.log(`${mark} ${result.name} - ${result.detail}`);
  }
}

async function main() {
  const baseUrl = process.env.SMOKE_BASE_URL?.trim();
  const checks = envCheck();
  if (baseUrl) {
    checks.push(...await routeChecks(baseUrl));
  } else {
    checks.push({
      name: "route:skipped",
      ok: true,
      detail: "set SMOKE_BASE_URL=https://your-domain to test deployed pages",
    });
  }

  printResults(checks);
  const failures = checks.filter((check) => !check.ok);
  if (failures.length) {
    console.error(`Smoke check failed: ${failures.length} issue(s).`);
    process.exit(1);
  }
}

void main();
