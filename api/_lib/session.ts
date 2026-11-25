import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "dr_session";
export const SESSION_SECONDS = 8 * 60 * 60;
export type Role = "candidate" | "employer" | "operator";
export interface Session {
  sub: string;
  role: Role;
  exp: number;
}

const MIN_SECRET_LENGTH = 32;

export function readSecret(env: NodeJS.ProcessEnv) {
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  return secret;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createToken(session: Session, secret: string) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyToken(token: string, secret: string, now = Date.now()): Session | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (
      typeof session.sub !== "string" ||
      !["candidate", "employer", "operator"].includes(session.role) ||
      typeof session.exp !== "number" ||
      session.exp * 1000 <= now
    )
      return null;
    return session;
  } catch {
    return null;
  }
}

export function readCookie(header: string | undefined, name: string) {
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

export function cookieHeader(value: string, maxAge: number, secure: boolean) {
  return [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
