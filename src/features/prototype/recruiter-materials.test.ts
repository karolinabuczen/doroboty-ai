import { describe, expect, it } from "vitest";
import { initialState } from "./model";
import { recruiterPortfolio } from "./recruiter-materials";

function annaApplication(portfolioItemIds: string[]) {
  const state = initialState();
  const application = { ...state.applications[0]!, candidateId: "candidate-anna", portfolioItemIds };
  return { state, application };
}

describe("recruiterPortfolio", () => {
  it("returns only the items attached to the application, with safe link info", () => {
    const { state, application } = annaApplication(["portfolio-anna-1", "portfolio-anna-3"]);
    const items = recruiterPortfolio(state, application);
    expect(items.map((x) => x.id)).toEqual(["portfolio-anna-1", "portfolio-anna-3"]);
    for (const item of items) {
      if (item.link) expect(item.link.url.startsWith("https://")).toBe(true);
    }
  });

  it("is empty when the application has no recorded attachments", () => {
    const { state, application } = annaApplication([]);
    expect(state.portfolio.some((x) => x.candidateId === "candidate-anna")).toBe(true);
    expect(recruiterPortfolio(state, application)).toEqual([]);
  });

  it("skips attached items that were deleted afterwards", () => {
    const { state, application } = annaApplication(["portfolio-anna-1", "gone"]);
    expect(recruiterPortfolio(state, application).map((x) => x.id)).toEqual(["portfolio-anna-1"]);
  });

  it("never exposes a link that fails the safe-link rules", () => {
    const { state, application } = annaApplication(["x"]);
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
    expect(recruiterPortfolio(state, application)[0]!.link).toBeUndefined();
  });
});
