import { describe, expect, it } from "vitest";
import {
  applicationStageLabel,
  applicationStageLabels,
  applicationStatusClass,
  applicationStatusDescription,
  applicationStatusDescriptions,
  applicationStatusLabel,
  applicationStatusLabels,
} from "@/features/applications/presentation";

describe("application presentation helpers", () => {
  it("returns a label for every known status and a fallback for unknown ones", () => {
    for (const [status, label] of Object.entries(applicationStatusLabels)) {
      expect(applicationStatusLabel(status)).toBe(label);
    }
    const fallback = applicationStatusLabel("does-not-exist");
    expect(fallback).not.toBe("");
    expect(Object.values(applicationStatusLabels)).not.toContain(fallback);
  });

  it("describes every known status", () => {
    for (const status of Object.keys(applicationStatusLabels)) {
      expect(applicationStatusDescription(status)).toBe(applicationStatusDescriptions[status]);
    }
    expect(Object.values(applicationStatusDescriptions)).not.toContain(
      applicationStatusDescription("does-not-exist"),
    );
  });

  it("returns a label for every known stage and a fallback for unknown ones", () => {
    for (const [stage, label] of Object.entries(applicationStageLabels)) {
      expect(applicationStageLabel(stage)).toBe(label);
    }
    expect(Object.values(applicationStageLabels)).not.toContain(applicationStageLabel("nope"));
  });

  it("maps status to distinct visual tones", () => {
    expect(applicationStatusClass("hired")).toBe(applicationStatusClass("continued"));
    expect(applicationStatusClass("hired")).toContain("success");
    expect(applicationStatusClass("rejected")).toBe(applicationStatusClass("withdrawn"));
    expect(applicationStatusClass("rejected")).toContain("error");
    expect(applicationStatusClass("interview")).toContain("color-1");
    expect(applicationStatusClass("submitted")).toBe(applicationStatusClass("unknown"));
  });
});
