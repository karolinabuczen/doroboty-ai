import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashPasswordSync, verifyPassword } from "./passwords.js";
import { resetRateLimits } from "./rate-limit.js";
import { createToken, verifyToken } from "./session.js";
import { handleApi } from "./routes.js";

const SECRET = "test-secret-test-secret-test-secret-123";
let server: Server;
let base = "";

beforeAll(async () => {
  process.env.SESSION_SECRET = SECRET;
  process.env.AUTH_USERS = JSON.stringify([
    {
      id: "candidate-anna",
      login: "anna",
      role: "candidate",
      hash: hashPasswordSync("correct-horse-1"),
    },
    {
      id: "employer-x",
      login: "Recruiter",
      role: "employer",
      hash: hashPasswordSync("another-pass-2"),
    },
  ]);
  server = createServer((req, res) => {
    void handleApi(req, res).then((handled) => {
      if (!handled) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => resetRateLimits());

function login(body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
function cookieOf(res: Response) {
  return res.headers.get("set-cookie")!.split(";")[0];
}

describe("passwords", () => {
  it("verifies only the right password and uses a fresh salt each time", async () => {
    const a = hashPasswordSync("secret-one");
    expect(a).not.toBe(hashPasswordSync("secret-one"));
    expect(a).not.toContain("secret-one");
    expect(await verifyPassword("secret-one", a)).toBe(true);
    expect(await verifyPassword("secret-two", a)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("session tokens", () => {
  const session = { sub: "a", role: "candidate" as const, exp: Math.floor(Date.now() / 1000) + 60 };
  it("rejects tampering, wrong secret and expiry", () => {
    const token = createToken(session, SECRET);
    expect(verifyToken(token, SECRET)?.sub).toBe("a");
    expect(verifyToken(token, "other-secret-other-secret-other-1234")).toBeNull();
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...session, role: "operator" })).toString(
      "base64url",
    );
    expect(verifyToken(`${forged}.${signature}`, SECRET)).toBeNull();
    expect(verifyToken(`${payload}.x`, SECRET)).toBeNull();
    expect(verifyToken(token, SECRET, Date.now() + 120_000)).toBeNull();
  });
});

describe("auth endpoints", () => {
  it("logs in, sets a hardened cookie, reports the session and logs out", async () => {
    const res = await login({ login: "ANNA", password: "correct-horse-1" });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(JSON.stringify(await res.json())).not.toMatch(/hash|password/i);
    const session = await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookieOf(res) } });
    expect(await session.json()).toEqual({ user: { id: "candidate-anna", role: "candidate" } });
    const out = await fetch(`${base}/api/auth/logout`, { method: "POST" });
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });
  it("marks the cookie Secure behind https", async () => {
    const res = await login(
      { login: "anna", password: "correct-horse-1" },
      { "X-Forwarded-Proto": "https" },
    );
    expect(res.headers.get("set-cookie")).toMatch(/Secure/);
  });
  it("gives the same answer for a wrong password and an unknown login", async () => {
    const wrong = await login({ login: "anna", password: "nope" });
    const unknown = await login({ login: "ghost", password: "nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
    expect(wrong.headers.get("set-cookie")).toBeNull();
  });
  it("treats missing, garbage and cross-site requests as errors", async () => {
    expect((await login({ login: "anna" })).status).toBe(400);
    expect(
      (await login({ login: "anna", password: "x" }, { Origin: "https://evil.example" })).status,
    ).toBe(403);
    expect((await fetch(`${base}/api/auth/login`)).status).toBe(405);
    const anonymous = await fetch(`${base}/api/auth/session`, {
      headers: { Cookie: "dr_session=bad.token" },
    });
    expect(await anonymous.json()).toEqual({ user: null });
  });
  it("locks a login after repeated failures, even for the right password", async () => {
    for (let i = 0; i < 5; i++) await login({ login: "anna", password: `wrong-${i}` });
    const locked = await login({ login: "anna", password: "correct-horse-1" });
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await login({ login: "Recruiter", password: "another-pass-2" })).status).toBe(200);
  });
  it("refuses to work without a configured secret", async () => {
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    expect((await login({ login: "anna", password: "correct-horse-1" })).status).toBe(503);
    process.env.SESSION_SECRET = saved;
  });
});
