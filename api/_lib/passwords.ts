import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";

// Stored format: scrypt:<N>:<r>:<p>:<salt base64url>:<key base64url>. No "$" so env files stay safe.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function format(salt: Buffer, key: Buffer) {
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64url")}:${key.toString("base64url")}`;
}

export function hashPasswordSync(password: string) {
  const salt = randomBytes(16);
  return format(salt, scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, { N, r: R, p: P }));
}

function derive(password: string, salt: Buffer, n: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { N: n, r, p }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, key] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), +n, +r, +p);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Used for unknown logins so that response time does not reveal whether a login exists.
export const DUMMY_HASH = hashPasswordSync(randomBytes(16).toString("hex"));
