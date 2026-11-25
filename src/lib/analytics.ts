// Minimal PostHog (EU) page-view tracking. No SDK: no autocapture, no session replay, no cookies.
// Events carry only the page path (no query/hash params) and the role, never names, logins or content.
export type AnalyticsRole = "candidate" | "recruiter" | "instructor" | "anonymous";

const HOST = "https://eu.i.posthog.com";
const ID_KEY = "doroboty.analytics.id";

function enabled(): string | null {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key || import.meta.env.MODE === "test") return null;
  // Automated browsers (end-to-end tests) never send events.
  if (typeof navigator !== "undefined" && navigator.webdriver) return null;
  return key;
}

function anonymousId(): string {
  try {
    let id = sessionStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function roleForPerson(role: string | undefined): AnalyticsRole {
  if (role === "candidate") return "candidate";
  if (role === "employer") return "recruiter";
  if (role === "operator") return "instructor";
  return "anonymous";
}

export function track(event: string, role: AnalyticsRole, path: string): void {
  const key = enabled();
  if (!key) return;
  const body = JSON.stringify({
    api_key: key,
    event,
    distinct_id: anonymousId(),
    properties: { role, path, $process_person_profile: false, $lib: "doroboty-minimal" },
  });
  void fetch(`${HOST}/capture/`, { method: "POST", body, keepalive: true }).catch(() => undefined);
}

export function trackPageView(role: AnalyticsRole, path: string): void {
  track("$pageview", role, path);
}
