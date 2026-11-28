// PostHog (EU) analytics with the full posthog-js library and click autocapture.
// Privacy guardrails: no session replay, no person profiles, text masked, and autocapture only
// reads clicks on links and buttons, so typed values (passwords, portfolio and application text,
// file inputs) are never captured. Visitors are identified by role only, never by name or login.
import type { CaptureResult, PostHog } from "posthog-js";

export type AnalyticsRole = "candidate" | "recruiter" | "instructor" | "anonymous";

const HOST = "https://eu.i.posthog.com";

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
    return posthog;
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
