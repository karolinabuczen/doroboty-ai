export type SessionUser = { id: string; role: "candidate" | "employer" | "operator" };
export type SignInResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "invalid" | "locked" | "unavailable"; retryAfterSeconds?: number };

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchSession(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    if (!res.ok) return null;
    const body = (await res.json()) as { user: SessionUser | null };
    return body.user ?? null;
  } catch {
    return null;
  }
}

export async function requestSignIn(login: string, password: string): Promise<SignInResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "same-origin",
      body: JSON.stringify({ login, password }),
    });
    if (res.ok) return { ok: true, user: ((await res.json()) as { user: SessionUser }).user };
    if (res.status === 401 || res.status === 400) return { ok: false, reason: "invalid" };
    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as { retryAfterSeconds?: number };
      return { ok: false, reason: "locked", retryAfterSeconds: body.retryAfterSeconds };
    }
    return { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function requestSignOut() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // The cookie expires on its own; the local view is cleared regardless.
  }
}
