import { describe, expect, it } from "vitest";
import {
  formatSalary,
  publicationStatusLabel,
  publicationStatusLabels,
} from "@/features/jobs/presentation";
import type { Job } from "@/features/jobs/types";

const job = (overrides: Record<string, unknown>) => overrides as unknown as Job;

describe("formatSalary", () => {
  it("reports undisclosed salary when no bounds exist", () => {
    const text = formatSalary(job({}));
    expect(text).not.toMatch(/\d/);
    expect(formatSalary(job({ salaryMin: 0, salaryMax: 0 }))).toBe(text);
  });

  it("formats a full range with currency, kind and period", () => {
    const text = formatSalary(
      job({
        salaryMin: 10000,
        salaryMax: 15000,
        salaryCurrency: "EUR",
        salaryKind: "net",
        salaryPeriod: "year",
      }),
    );
    expect(text.replace(/\s/g, "")).toContain("10000–15000EUR");
    expect(text).toContain("netto");
    expect(text).toContain("rok");
  });

  it("defaults to PLN, gross and monthly, and handles a single bound", () => {
    const text = formatSalary(job({ salaryMin: 8000 }));
    expect(text.replace(/\s/g, "")).toBe("8000PLNbrutto/mies.");
  });
});

describe("publicationStatusLabel", () => {
  it("labels known statuses and falls back for unknown", () => {
    for (const [status, label] of Object.entries(publicationStatusLabels)) {
      expect(publicationStatusLabel(status)).toBe(label);
    }
    expect(Object.values(publicationStatusLabels)).not.toContain(publicationStatusLabel("x"));
  });
});
