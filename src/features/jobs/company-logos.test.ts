import { describe, expect, it } from "vitest";
import {
  companyInitials,
  companyLogoUrl,
  generatedCompanyLogos,
} from "@/features/jobs/company-logos";

describe("companyLogoUrl", () => {
  it("prefers a custom same-origin path", () => {
    expect(companyLogoUrl({ slug: "demo-kobalt-labs", logoUrl: " /custom.png " })).toBe(
      "/custom.png",
    );
  });

  it("rejects external and protocol-relative custom URLs", () => {
    expect(
      companyLogoUrl({ slug: "unknown", logoUrl: "https://evil.example/x.png" }),
    ).toBeUndefined();
    expect(companyLogoUrl({ slug: "unknown", logoUrl: "//evil.example/x.png" })).toBeUndefined();
  });

  it("falls back to the generated logo for synthetic companies only", () => {
    expect(companyLogoUrl({ slug: "demo-kobalt-labs", logoUrl: undefined })).toBe(
      generatedCompanyLogos["demo-kobalt-labs"],
    );
    expect(companyLogoUrl({ slug: "toString", logoUrl: undefined })).toBeUndefined();
    expect(companyLogoUrl({ slug: "unknown", logoUrl: undefined })).toBeUndefined();
  });
});

describe("companyInitials", () => {
  it("uses the first letters of the first two words in upper case", () => {
    expect(companyInitials("  kobalt labs sp. z o.o. ")).toBe("KL");
    expect(companyInitials("Atlas")).toBe("A");
    expect(companyInitials("")).toBe("");
  });
});
