import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { DUMMY_HASH, verifyPassword } from "./passwords.js";
import { clearFailures, recordFailure, retryAfterSeconds, type Limits } from "./rate-limit.js";
import {
  COOKIE_NAME,
  SESSION_SECONDS,
  cookieHeader,
  createToken,
  readCookie,
  readSecret,
  verifyToken,
  type Role,
} from "./session.js";

type Req = IncomingMessage & { body?: unknown };
type Res = ServerResponse;
const userSchema = z.array(
  z.object({
    id: z.string().min(1),
    login: z.string().min(1),
    role: z.enum(["candidate", "employer", "operator"]),
    hash: z.string().min(1),
  }),
);
const loginSchema = z.object({
  login: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});
const LOGIN_LIMITS: Limits = { maxFails: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
const ADDRESS_LIMITS: Limits = { maxFails: 30, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
const MAX_BODY_BYTES = 4096;

function send(res: Res, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

function loadUsers(env: NodeJS.ProcessEnv) {
  try {
    return userSchema.parse(JSON.parse(env.AUTH_USERS ?? ""));
  } catch {
    return null;
  }
}

function header(req: Req, name: string) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function isSecure(req: Req) {
  const host = (header(req, "host") ?? "").split(":")[0];
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  return !(local && header(req, "x-forwarded-proto") !== "https");
}

function sameOrigin(req: Req) {
  const origin = header(req, "origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === header(req, "host");
  } catch {
    return false;
  }
}

function address(req: Req) {
  const forwarded = header(req, "x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

async function readBody(req: Req) {
  if (req.body !== undefined) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("Body too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function currentSession(req: Req, env: NodeJS.ProcessEnv) {
  const secret = readSecret(env);
  const token = readCookie(header(req, "cookie"), COOKIE_NAME);
  return secret && token ? verifyToken(token, secret) : null;
}

export async function handleLogin(req: Req, res: Res, env: NodeJS.ProcessEnv = process.env) {
  if (req.method !== "POST")
    return send(res, 405, { error: "method_not_allowed" }, { Allow: "POST" });
  if (!sameOrigin(req)) return send(res, 403, { error: "forbidden" });
  const secret = readSecret(env);
  const users = loadUsers(env);
  if (!secret || !users) return send(res, 503, { error: "not_configured" });
  let input: z.infer<typeof loginSchema>;
  try {
    input = loginSchema.parse(await readBody(req));
  } catch {
    return send(res, 400, { error: "invalid_request" });
  }
  const loginKey = `login:${input.login.toLowerCase()}`;
  const addressKey = `address:${address(req)}`;
  const wait = Math.max(retryAfterSeconds(loginKey), retryAfterSeconds(addressKey));
  if (wait > 0)
    return send(
      res,
      429,
      { error: "locked", retryAfterSeconds: wait },
      { "Retry-After": String(wait) },
    );
  const user = users.find((x) => x.login.toLowerCase() === input.login.toLowerCase());
  const valid = await verifyPassword(input.password, user?.hash ?? DUMMY_HASH);
  if (!user || !valid) {
    recordFailure(loginKey, LOGIN_LIMITS);
    recordFailure(addressKey, ADDRESS_LIMITS);
    return send(res, 401, { error: "invalid_credentials" });
  }
  clearFailures(loginKey);
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const token = createToken({ sub: user.id, role: user.role as Role, exp }, secret);
  return send(
    res,
    200,
    { user: { id: user.id, role: user.role } },
    { "Set-Cookie": cookieHeader(token, SESSION_SECONDS, isSecure(req)) },
  );
}

export async function handleLogout(req: Req, res: Res) {
  if (req.method !== "POST")
    return send(res, 405, { error: "method_not_allowed" }, { Allow: "POST" });
  if (!sameOrigin(req)) return send(res, 403, { error: "forbidden" });
  return send(res, 200, { ok: true }, { "Set-Cookie": cookieHeader("", 0, isSecure(req)) });
}

export async function handleSession(req: Req, res: Res, env: NodeJS.ProcessEnv = process.env) {
  if (req.method !== "GET")
    return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET" });
  const session = currentSession(req, env);
  if (!session) return send(res, 200, { user: null });
  return send(res, 200, { user: { id: session.sub, role: session.role } });
}

const routes: Record<string, (req: Req, res: Res) => Promise<unknown>> = {
  "/api/auth/login": handleLogin,
  "/api/auth/logout": handleLogout,
  "/api/auth/session": handleSession,
};

// Used by the local dev/preview server so the same handlers run without Vercel.
export async function handleApi(req: Req, res: Res) {
  const path = (req.url ?? "").split("?")[0];
  const route = routes[path];
  if (!route) return false;
  try {
    await route(req, res);
  } catch {
    if (!res.headersSent) send(res, 500, { error: "server_error" });
    else res.end();
  }
  return true;
}
