// PostHog (EU) analytics with the full posthog-js library and click autocapture.
// Privacy guardrails: no session replay, no person profiles, text masked, and autocapture only
// reads clicks on links and buttons, so typed values (passwords, portfolio and application text,
// file inputs) are never captured. Visitors are identified by role only, never by name or login.
import type { CaptureResult, PostHog } from "posthog-js";

export type AnalyticsRole = "candidate" | "recruiter" | "instructor" | "anonymous";

// Events go through our own domain (/ingest, relayed to PostHog EU by Vercel rewrites or the Vite proxy).
const HOST = "/ingest";

// Neutral same-origin paths for the relay (mirrored in vercel.json and vite.config.ts), so common
// blocker filter lists that match PostHog's default endpoint paths do not match our own URLs.
const PATH_ALIASES: Array<[RegExp, string]> = [
  [/^\/i\/v0\/e\/?/, "/c/"],
  [/^\/e\/?/, "/c/"],
  [/^\/array\//, "/lib/"],
  [/^\/static\//, "/res/"],
];

function neutralPath(path = ""): string {
  for (const [pattern, alias] of PATH_ALIASES) if (pattern.test(path)) return path.replace(pattern, alias);
  return path;
}

function enabledKey(): string | null {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key || import.meta.env.MODE === "test") return null;
  // Automated browsers (end-to-end tests) never send events.
  if (typeof navigator !== "undefined" && navigator.webdriver) return null;
  return key;
}

let client: Promise<PostHog> | null = null;

function load(key: string): Promise<PostHog> {
  client ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: HOST,
      ui_host: "https://eu.posthog.com",
      advanced_disable_flags: true,
      defaults: "2025-05-24",
      autocapture: {
        dom_event_allowlist: ["click"],
        element_allowlist: ["a", "button"],
      },
      mask_all_text: true,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      person_profiles: "never",
      persistence: "localStorage",
      // Hash routes can carry a return path in the query; keep only the page path.
      before_send: (event: CaptureResult | null) => {
        const url = event?.properties?.$current_url;
        if (event && typeof url === "string") event.properties.$current_url = url.split("?")[0];
        return event;
      },
    });
    // posthog-js has no setting for endpoint paths; alias them where it builds its request URLs.
    const endpointFor = posthog.requestRouter.endpointFor.bind(posthog.requestRouter);
    posthog.requestRouter.endpointFor = (target, path) => endpointFor(target, neutralPath(path));    return posthog;
  });
  return client;
}

export function roleForPerson(role: string | undefined): AnalyticsRole {
  if (role === "candidate") return "candidate";
  if (role === "employer") return "recruiter";
  if (role === "operator") return "instructor";
  return "anonymous";
}

export function trackPageView(role: AnalyticsRole, path: string): void {
  const key = enabledKey();
  if (!key) return;
  void load(key)
    .then((posthog) => {
      posthog.register({ role });
      posthog.capture("$pageview", { path, role });
    })
    .catch(() => undefined);
}
