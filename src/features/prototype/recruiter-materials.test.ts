import { describe, expect, it } from "vitest";
import { initialState } from "./model";
import { recruiterPortfolio } from "./recruiter-materials";

describe("recruiterPortfolio", () => {
  it("returns only the requested candidate's items with safe link info", () => {
    const state = initialState();
    const items = recruiterPortfolio(state, "candidate-anna");
    expect(items.length).toBe(
      state.portfolio.filter((x) => x.candidateId === "candidate-anna").length,
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.title).toBeTruthy();
      if (item.link) expect(item.link.url.startsWith("https://")).toBe(true);
    }
  });

  it("is empty for a candidate without portfolio items", () => {
    expect(recruiterPortfolio(initialState(), "candidate-marek")).toEqual([]);
  });

  it("never exposes a link that fails the safe-link rules", () => {
    const state = initialState();
    state.portfolio = [
      {
        id: "x",
        candidateId: "candidate-anna",
        title: "Zły link",
        type: "repository",
        url: "http://localhost/x",
        description: "",
      },
    ];
    expect(recruiterPortfolio(state, "candidate-anna")[0]!.link).toBeUndefined();
  });
});
