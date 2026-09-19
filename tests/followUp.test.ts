import { describe, expect, it } from "vitest";
import { addDaysISO, describeFollowUp, getFollowUpState, isFollowUpDue, todayISO } from "@/lib/followUp";

const TODAY = "2026-09-19";

describe("getFollowUpState", () => {
  it("returns null without a date", () => {
    expect(getFollowUpState({ status: "Applied", followUpDate: null }, TODAY)).toBeNull();
  });

  it("returns null once an application is closed", () => {
    expect(getFollowUpState({ status: "Rejected", followUpDate: "2026-09-01" }, TODAY)).toBeNull();
    expect(getFollowUpState({ status: "Selected", followUpDate: "2026-09-01" }, TODAY)).toBeNull();
  });

  it.each([
    ["2026-09-17", "overdue", -2],
    ["2026-09-19", "today", 0],
    ["2026-09-20", "soon", 1],
    ["2026-09-22", "soon", 3],
    ["2026-09-23", "upcoming", 4],
  ])("classifies %s as %s", (date, kind, days) => {
    expect(getFollowUpState({ status: "Interview", followUpDate: date }, TODAY)).toEqual({ kind, days });
  });

  it("counts whole calendar days across month and year boundaries", () => {
    expect(getFollowUpState({ status: "Applied", followUpDate: "2027-01-01" }, "2026-12-31")?.days).toBe(1);
    expect(getFollowUpState({ status: "Applied", followUpDate: "2026-03-01" }, "2026-02-28")?.days).toBe(1);
  });
});

describe("isFollowUpDue", () => {
  it("is true for overdue and today, false otherwise", () => {
    expect(isFollowUpDue({ status: "Applied", followUpDate: "2026-09-10" }, TODAY)).toBe(true);
    expect(isFollowUpDue({ status: "Applied", followUpDate: TODAY }, TODAY)).toBe(true);
    expect(isFollowUpDue({ status: "Applied", followUpDate: "2026-09-25" }, TODAY)).toBe(false);
  });
});

describe("helpers", () => {
  it("addDaysISO adds days without timezone drift", () => {
    expect(addDaysISO(3, "2026-09-19")).toBe("2026-09-22");
    expect(addDaysISO(14, "2026-12-25")).toBe("2027-01-08");
  });

  it("todayISO formats a local date", () => {
    expect(todayISO(new Date(2026, 8, 5))).toBe("2026-09-05");
  });

  it("describes each state in plain language", () => {
    expect(describeFollowUp({ kind: "overdue", days: -1 }, "2026-09-18")).toBe("Follow-up overdue by 1 day");
    expect(describeFollowUp({ kind: "overdue", days: -5 }, "2026-09-14")).toBe("Follow-up overdue by 5 days");
    expect(describeFollowUp({ kind: "today", days: 0 }, TODAY)).toBe("Follow up today");
    expect(describeFollowUp({ kind: "soon", days: 1 }, "2026-09-20")).toBe("Follow up tomorrow");
    expect(describeFollowUp({ kind: "soon", days: 3 }, "2026-09-22")).toBe("Follow up in 3 days");
  });
});
