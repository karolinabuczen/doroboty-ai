import { describe, expect, it } from "vitest";
import { initialState, transition, stateSchema, checkPortfolioFile, type State } from "./model";
import { checkPortfolioUrl } from "./portfolio-links";
const time = "2026-11-03T10:00:00.000Z";
function as(state: State, id: string) {
  return transition(state, { type: "select_person", id });
}
function submitted() {
  const s = as(initialState(), "candidate-anna");
  return transition(
    s,
    {
      type: "submit",
      jobId: s.jobs[0].id,
      notes: "Original notes",
      generated: "Generated copy",
      answer: "Approved application with sufficient context.",
      consent: true,
    },
    time,
    "application-anna",
  );
}
describe("portfolio link rules", () => {
  it("refuses credentials, IPs, localhost, shorteners and non-https links", () => {
    for (const url of [
      "https://user:pw@github.com/a/b",
      "https://192.168.0.1/repo",
      "https://[::1]/x",
      "https://localhost/x",
      "https://app.local/x",
      "https://bit.ly/abc",
      "http://github.com/a/b",
    ])
      expect(checkPortfolioUrl("application", url), url).toHaveProperty("error");
  });
  it("allows only listed hosts for repository, contribution and video", () => {
    expect(checkPortfolioUrl("repository", "https://github.com/a/b")).toEqual({
      host: "github.com",
      verified: true,
    });
    expect(
      checkPortfolioUrl("contribution", "https://gitlab.com/a/b/-/merge_requests/1"),
    ).toMatchObject({
      verified: true,
    });
    expect(checkPortfolioUrl("video", "https://youtu.be/abc")).toMatchObject({ verified: true });
    expect(checkPortfolioUrl("video", "https://www.loom.com/share/x")).toMatchObject({
      verified: true,
    });
    expect(checkPortfolioUrl("repository", "https://evilgithub.com/a")).toHaveProperty("error");
    expect(checkPortfolioUrl("video", "https://github.com/a")).toHaveProperty("error");
    expect(checkPortfolioUrl("repository", "https://github.com.evil.io/a")).toHaveProperty("error");
  });
  it("accepts any https link for other types but marks it unverified", () => {
    expect(checkPortfolioUrl("application", "https://my-app.example.com")).toEqual({
      host: "my-app.example.com",
      verified: false,
    });
    expect(checkPortfolioUrl("agent_chat", "https://example.com/c")).toMatchObject({
      verified: false,
    });
  });
  it("is enforced when adding an item", () => {
    const s = as(initialState(), "candidate-anna");
    expect(() =>
      transition(s, {
        type: "portfolio_add",
        value: { title: "x", type: "repository", url: "https://example.com/a", description: "" },
      }),
    ).toThrow("github.com");
  });
});
describe("candidate portfolio", () => {
  const blank = () => ({ ...initialState(), portfolio: [] });
  const value = {
    title: "Mój agent",
    type: "repository" as const,
    url: "https://github.com/example/agent",
    description: "Opis",
  };
  it("adds and removes only own items and rejects bad URLs", () => {
    const anna = transition(
      as(blank(), "candidate-anna"),
      { type: "portfolio_add", value },
      time,
      "item-1",
    );
    expect(anna.portfolio).toHaveLength(1);
    expect(() =>
      transition(anna, { type: "portfolio_add", value: { ...value, url: "javascript:alert(1)" } }),
    ).toThrow();
    const marek = as(anna, "candidate-marek");
    expect(() => transition(marek, { type: "portfolio_remove", id: "item-1" })).toThrow(
      "Nie znaleziono",
    );
    expect(transition(anna, { type: "portfolio_remove", id: "item-1" }).portfolio).toHaveLength(0);
  });
  it("accepts every offered portfolio type and rejects unknown ones", () => {
    const types = ["repository", "application", "video", "contribution", "agent_chat"] as const;
    const urls = {
      repository: "https://github.com/example/agent",
      application: "https://app.example.com",
      video: "https://www.youtube.com/watch?v=abc",
      contribution: "https://github.com/org/repo/pull/1",
      agent_chat: "https://example.com/chat",
    };
    let s = as(blank(), "candidate-anna");
    types.forEach((type, i) => {
      s = transition(
        s,
        { type: "portfolio_add", value: { ...value, type, url: urls[type] } },
        time,
        `item-${i}`,
      );
    });
    expect(s.portfolio.map((x) => x.type)).toEqual([...types]);
    expect(() =>
      transition(s, { type: "portfolio_add", value: { ...value, type: "other" as never } }),
    ).toThrow();
  });
  it("accepts a link or an uploaded file for video and agent chats, but needs one of them", () => {
    const s = as(blank(), "candidate-anna");
    const file = {
      id: "file-1",
      name: "rozmowa.md",
      mimeType: "text/markdown" as const,
      size: 120,
    };
    const withFile = transition(
      s,
      { type: "portfolio_add", value: { ...value, type: "agent_chat", url: "", file } },
      time,
      "item-f",
    );
    expect(withFile.portfolio[0].file?.name).toBe("rozmowa.md");
    expect(() =>
      transition(s, { type: "portfolio_add", value: { ...value, type: "video", url: "" } }),
    ).toThrow();
    expect(() =>
      transition(s, { type: "portfolio_add", value: { ...value, type: "repository", file } }),
    ).toThrow();
  });
  it("validates portfolio files per type: video only for Wideo, text only for conversations", () => {
    const video = { name: "demo.mp4", type: "video/mp4", size: 5_000_000 };
    expect(checkPortfolioFile(video, "video")).toEqual({ mimeType: "video/mp4" });
    expect(checkPortfolioFile({ name: "chat.md", type: "", size: 10 }, "text")).toEqual({
      mimeType: "text/markdown",
    });
    const bad = (f: { name: string; type: string; size: number }, k: "video" | "text") =>
      "error" in checkPortfolioFile(f, k);
    expect(bad({ ...video, size: 60 * 1024 * 1024 }, "video")).toBe(true);
    expect(bad({ name: "chat.txt", type: "text/plain", size: 2e6 }, "text")).toBe(true);
    expect(bad({ name: "a.mp3", type: "audio/mpeg", size: 10 }, "video")).toBe(true);
    expect(bad({ name: "a.png", type: "image/png", size: 10 }, "video")).toBe(true);
    expect(bad({ name: "chat.txt", type: "text/plain", size: 10 }, "video")).toBe(true);
    expect(bad(video, "text")).toBe(true);
    expect(bad({ name: "a.png", type: "image/png", size: 10 }, "text")).toBe(true);
    expect(bad({ name: "x.exe", type: "", size: 10 }, "text")).toBe(true);
    expect(bad({ ...video, size: 0 }, "video")).toBe(true);
  });
  it("rejects a file of the wrong kind for the item type", () => {
    const s = as(blank(), "candidate-anna");
    const mp4 = { id: "file-2", name: "demo.mp4", mimeType: "video/mp4" as const, size: 10 };
    const md = { id: "file-3", name: "chat.md", mimeType: "text/markdown" as const, size: 10 };
    const add = (type: "video" | "agent_chat", file: typeof mp4 | typeof md) =>
      transition(s, { type: "portfolio_add", value: { ...value, type, url: "", file } });
    expect(add("video", mp4).portfolio).toHaveLength(1);
    expect(add("agent_chat", md).portfolio).toHaveLength(1);
    expect(() => add("video", md)).toThrow();
    expect(() => add("agent_chat", mp4)).toThrow();
  });
  it("loads saved state without a portfolio", () => {
    const { portfolio, ...legacy } = blank();
    expect(portfolio).toEqual([]);
    expect(stateSchema.parse(legacy).portfolio).toEqual([]);
  });
  it("seeds Anna Kowalska with valid examples of different types", () => {
    const items = initialState().portfolio.filter((x) => x.candidateId === "candidate-anna");
    expect(new Set(items.map((x) => x.type)).size).toBeGreaterThanOrEqual(3);
    items.forEach((x) => expect(checkPortfolioUrl(x.type, x.url)).not.toHaveProperty("error"));
    expect(initialState().portfolio.some((x) => x.candidateId === "candidate-marek")).toBe(false);
  });
  it("drops saved items that break the link rules instead of rejecting the whole state", () => {
    const saved = JSON.parse(JSON.stringify(initialState()));
    saved.portfolio.push({ ...saved.portfolio[0], id: "bad", url: "http://127.0.0.1/x" });
    const parsed = stateSchema.parse(saved);
    expect(parsed.portfolio.map((x) => x.id)).not.toContain("bad");
    expect(parsed.portfolio).toHaveLength(initialState().portfolio.length);
  });
});
describe("coherent browser scenario", () => {
  it("requires approval and prevents duplicate applications", () => {
    const s = as(initialState(), "candidate-anna");
    const input = {
      type: "submit" as const,
      jobId: s.jobs[0].id,
      notes: "",
      generated: "",
      answer: "Approved application with sufficient context.",
      consent: false,
    };
    expect(() => transition(s, input, time)).toThrow("Zatwierdź");
    expect(() => transition(submitted(), { ...input, consent: true }, time)).toThrow("już wysłana");
    expect(s.applications).toHaveLength(1);
  });
  it("preserves approved sources while profile and notes evolve", () => {
    const s = submitted();
    const app = s.applications.at(-1)!;
    const changed = transition(s, {
      type: "profile",
      value: {
        name: "Updated Name",
        headline: "Updated Headline",
        bio: "Changed",
        location: "Wrocław",
      },
    });
    expect(changed.applications.at(-1)).toEqual(app);
    expect(app.candidateName).toBe("Anna Kowalska");
    expect(app.sourceNotes).toBe("Original notes");
    expect(app.generatedAnswer).toBe("Generated copy");
  });
  it("supports employer review through conversation and continuation without skipping stages", () => {
    let s = as(submitted(), "employer-brightlabs");
    expect(() =>
      transition(
        s,
        { type: "stage", applicationId: "application-anna", stage: "continued", note: "" },
        time,
      ),
    ).toThrow();
    for (const stage of [
      "reviewed",
      "interview_invited",
      "first_conversation_held",
      "continued",
      "hired",
    ] as const)
      s = transition(
        s,
        { type: "stage", applicationId: "application-anna", stage, note: "Employer note" },
        time,
      );
    expect(s.applications.at(-1)?.stage).toBe("hired");
    expect(s.applications.at(-1)?.events).toHaveLength(6);
  });
  it("rejects another employer’s stage writes and another candidate’s withdrawal", () => {
    expect(() =>
      transition(
        as(submitted(), "employer-northstar"),
        { type: "stage", applicationId: "application-anna", stage: "reviewed", note: "" },
        time,
      ),
    ).toThrow();
    expect(() =>
      transition(
        as(submitted(), "candidate-marek"),
        { type: "withdraw", applicationId: "application-anna" },
        time,
      ),
    ).toThrow();
  });
  it("makes withdrawal terminal and keeps drafts and saved jobs person-specific", () => {
    let s = submitted();
    s = transition(s, { type: "withdraw", applicationId: "application-anna" }, time);
    expect(() =>
      transition(
        as(s, "employer-brightlabs"),
        { type: "stage", applicationId: "application-anna", stage: "reviewed", note: "" },
        time,
      ),
    ).toThrow();
    s = transition(s, {
      type: "draft",
      jobId: s.jobs[1].id,
      notes: "Notes",
      generated: "Output",
      answer: "Edited",
    });
    s = transition(s, { type: "toggle_saved", jobId: s.jobs[1].id });
    expect(s.drafts[0].candidateId).toBe("candidate-anna");
    expect(s.saved[0].candidateId).toBe("candidate-anna");
  });
  it("validates broken references, duplicate submissions and invalid histories on import", () => {
    const s = submitted();
    s.applications.push({ ...s.applications.at(-1)!, id: "another-id" });
    expect(stateSchema.safeParse(s).success).toBe(false);
    const broken = submitted();
    broken.applications.at(-1)!.events.push({ stage: "hired", at: time, note: "" });
    broken.applications.at(-1)!.stage = "hired";
    expect(stateSchema.safeParse(broken).success).toBe(false);
    const unknown = initialState();
    unknown.jobs[0].companyId = "missing";
    expect(stateSchema.safeParse(unknown).success).toBe(false);
  });
  it("only publishes own-company jobs and keeps submitted job snapshots unchanged", () => {
    const state = as(submitted(), "employer-brightlabs");
    const updated = { ...state.jobs[0], title: "Updated public role" };
    const result = transition(state, { type: "publish", job: updated });
    expect(result.jobs[0].title).toBe("Updated public role");
    expect(result.applications.at(-1)?.jobTitle).toBe("AI Product Manager");
    expect(() =>
      transition(as(state, "employer-northstar"), { type: "publish", job: updated }),
    ).toThrow();
    expect(() =>
      transition(state, { type: "publish", job: { ...updated, salaryMin: 500, salaryMax: 1 } }),
    ).toThrow();
  });
});
