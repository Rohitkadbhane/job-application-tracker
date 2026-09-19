import { describe, expect, it } from "vitest";
import { createApplicationSchema, idSchema, toFieldErrors, updateApplicationSchema } from "@/lib/validation";

describe("createApplicationSchema", () => {
  it("accepts a valid application and applies defaults", () => {
    const result = createApplicationSchema.parse({ company: "  Acme  ", role: "Engineer" });
    expect(result).toEqual({ company: "Acme", role: "Engineer", status: "Applied", followUpDate: null });
  });

  it("rejects blank company and role with friendly messages", () => {
    const result = createApplicationSchema.safeParse({ company: "   ", role: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({
        company: "Company name is required",
        role: "Job role is required",
      });
    }
  });

  it("rejects unknown statuses", () => {
    const result = createApplicationSchema.safeParse({ company: "A", role: "B", status: "Ghosted" });
    expect(result.success).toBe(false);
  });

  it("rejects over-long text", () => {
    const result = createApplicationSchema.safeParse({ company: "x".repeat(101), role: "B" });
    expect(result.success).toBe(false);
  });

  it("validates follow-up dates as real calendar days", () => {
    const base = { company: "A", role: "B" };
    expect(createApplicationSchema.safeParse({ ...base, followUpDate: "2026-10-05" }).success).toBe(true);
    expect(createApplicationSchema.safeParse({ ...base, followUpDate: "2026-02-31" }).success).toBe(false);
    expect(createApplicationSchema.safeParse({ ...base, followUpDate: "05/10/2026" }).success).toBe(false);
    expect(createApplicationSchema.safeParse({ ...base, followUpDate: null }).success).toBe(true);
  });
});

describe("updateApplicationSchema", () => {
  it("allows partial updates", () => {
    expect(updateApplicationSchema.parse({ status: "Interview" })).toEqual({ status: "Interview" });
  });

  it("rejects an empty patch", () => {
    expect(updateApplicationSchema.safeParse({}).success).toBe(false);
  });

  it("allows clearing the follow-up date", () => {
    expect(updateApplicationSchema.parse({ followUpDate: null })).toEqual({ followUpDate: null });
  });
});

describe("idSchema", () => {
  it("accepts UUIDs and rejects anything else", () => {
    expect(idSchema.safeParse(crypto.randomUUID()).success).toBe(true);
    expect(idSchema.safeParse("../../etc/passwd").success).toBe(false);
  });
});
