// @vitest-environment jsdom
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as collection from "@/app/api/applications/route";
import * as item from "@/app/api/applications/[id]/route";
import { JobTracker } from "@/components/tracker/JobTracker";
import { ToastProvider } from "@/components/ui/Toast";
import { addDaysISO } from "@/lib/followUp";

/**
 * Integration tests: the real React UI talks to the real route handlers and the real
 * JSON-file store. Only the network hop is replaced by a function call.
 */

let dir: string;
let cookie = "";
let failNext: { method: string; status: number } | null = null;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "jobline-ui-"));
  process.env.DATA_FILE = join(dir, "db.json");
  // jsdom doesn't implement <dialog> methods.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

beforeEach(() => {
  cookie = ""; // a fresh browser = a fresh workspace
  failNext = null;
  vi.stubGlobal("fetch", async (input: string, init: RequestInit = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    if (failNext && failNext.method === method) {
      const { status } = failNext;
      failNext = null;
      return new Response(JSON.stringify({ error: { code: "X", message: "Server said no" } }), { status });
    }
    const url = new URL(input, "http://localhost");
    const request = new NextRequest(url, {
      method,
      headers: { ...(init.headers as Record<string, string>), cookie },
      body: init.body as string | undefined,
    });
    const id = url.pathname.split("/")[3];
    const response = id
      ? await (method === "PATCH" ? item.PATCH : item.DELETE)(request, { params: Promise.resolve({ id }) })
      : await (method === "POST" ? collection.POST : collection.GET)(request, { params: Promise.resolve({}) });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0] ?? "";
    return response;
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const renderApp = () =>
  render(
    <ToastProvider>
      <JobTracker />
    </ToastProvider>,
  );

async function addApplication(
  user: ReturnType<typeof userEvent.setup>,
  values: { company: string; role: string; status?: string; followUp?: string },
) {
  await user.click(screen.getAllByRole("button", { name: /add application/i })[0]!);
  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText("Company name"), values.company);
  await user.type(within(dialog).getByLabelText("Job role"), values.role);
  if (values.status) await user.click(within(dialog).getByLabelText(values.status));
  if (values.followUp) {
    const input = within(dialog).getByLabelText(/follow-up date/i);
    await user.type(input, values.followUp);
  }
  await user.click(within(dialog).getByRole("button", { name: "Add application" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

const stat = (label: string) => {
  const dt = screen.getByText(label, { selector: "dt" });
  return dt.nextElementSibling?.textContent;
};

describe("Jobline UI", () => {
  it("shows a loading skeleton, then the empty state with a call to action", async () => {
    renderApp();
    expect(screen.getByRole("status", { name: /loading applications/i })).toBeTruthy();
    expect(await screen.findByText("Your line is empty")).toBeTruthy();
    expect(stat("Total applications")).toBe("0");
  });

  it("adds an application, shows it in the list and updates the summary", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your line is empty");

    await addApplication(user, { company: "Acme Corp", role: "Frontend Engineer" });

    expect(await screen.findByText("Acme Corp")).toBeTruthy();
    expect(screen.getByText("Frontend Engineer")).toBeTruthy();
    expect(stat("Total applications")).toBe("1");
    expect(screen.getByText("Added Acme Corp")).toBeTruthy(); // success toast
  });

  it("validates the form and keeps the dialog open with helpful messages", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your line is empty");

    await user.click(screen.getAllByRole("button", { name: /add application/i })[0]!);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add application" }));

    expect(within(dialog).getByText("Company name is required")).toBeTruthy();
    expect(within(dialog).getByText("Job role is required")).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByLabelText("Company name"));
  });

  it("changes status, updates the summary counts, and persists across a reload", async () => {
    const user = userEvent.setup();
    const first = renderApp();
    await screen.findByText("Your line is empty");
    await addApplication(user, { company: "Globex", role: "Designer" });

    const select = await screen.findByLabelText("Status for Globex, Designer");
    await user.selectOptions(select, "Interview");
    await waitFor(() => expect(stat("Interviews")).toBe("1"));

    await user.selectOptions(select, "Selected");
    await waitFor(() => expect(stat("Selected")).toBe("1"));
    expect(stat("Interviews")).toBe("0");

    // "Reload": new mount, same cookie -> data comes back from the JSON store.
    first.unmount();
    renderApp();
    expect(await screen.findByText("Globex")).toBeTruthy();
    expect((screen.getByLabelText("Status for Globex, Designer") as HTMLSelectElement).value).toBe("Selected");
  });

  it("rolls back an optimistic status change when the server fails", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your line is empty");
    await addApplication(user, { company: "Initech", role: "Analyst" });

    const select = (await screen.findByLabelText("Status for Initech, Analyst")) as HTMLSelectElement;
    failNext = { method: "PATCH", status: 500 };
    await user.selectOptions(select, "Rejected");

    expect(await screen.findByText("Server said no")).toBeTruthy();
    await waitFor(() => expect(select.value).toBe("Applied"));
  });

  it("filters by status and offers a way back when nothing matches", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your line is empty");
    await addApplication(user, { company: "Alpha", role: "Dev", status: "Applied" });
    await addApplication(user, { company: "Beta", role: "Dev", status: "Interview" });

    await user.click(screen.getByRole("button", { name: /^Interview/ }));
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.getByText("Beta")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Selected/ }));
    expect(await screen.findByText("Nothing matches these filters")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Show all applications" }));
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("flags overdue follow-ups and filters to those that need action", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your line is empty");
    const overdue = addDaysISO(-2);
    const later = addDaysISO(20);
    await addApplication(user, { company: "Late Co", role: "PM", followUp: overdue });
    await addApplication(user, { company: "Future Co", role: "PM", followUp: later });

    expect(await screen.findByText("Follow-up overdue by 2 days")).toBeTruthy();
    expect(stat("Follow-ups due")).toBe("1");

    await user.click(screen.getByRole("button", { name: /needs follow-up/i }));
    expect(screen.getByText("Late Co")).toBeTruthy();
    expect(screen.queryByText("Future Co")).toBeNull();
  });

  it("edits an application from the same form", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your line is empty");
    await addApplication(user, { company: "Oldname", role: "Dev" });

    await user.click(await screen.findByRole("button", { name: "Edit Oldname" }));
    const dialog = await screen.findByRole("dialog");
    const company = within(dialog).getByLabelText("Company name");
    await user.clear(company);
    await user.type(company, "Newname");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Newname")).toBeTruthy();
    expect(screen.queryByText("Oldname")).toBeNull();
  });

  it("asks for confirmation before deleting, and deleting is undoable by cancelling", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your line is empty");
    await addApplication(user, { company: "Umbrella", role: "QA" });

    await user.click(await screen.findByRole("button", { name: "Delete Umbrella" }));
    let dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Keep it" }));
    expect(screen.getByText("Umbrella")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Delete Umbrella" }));
    dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete application" }));

    await waitFor(() => expect(screen.queryByText("Umbrella")).toBeNull());
    expect(await screen.findByText("Your line is empty")).toBeTruthy();
  });

  it("restores the row if a delete fails", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your line is empty");
    await addApplication(user, { company: "Hooli", role: "SRE" });

    await user.click(await screen.findByRole("button", { name: "Delete Hooli" }));
    failNext = { method: "DELETE", status: 500 };
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete application" }));

    expect(await screen.findByText("Server said no")).toBeTruthy();
    expect(screen.getByText("Hooli")).toBeTruthy();
  });

  it("shows an error state with retry when loading fails", async () => {
    failNext = { method: "GET", status: 503 };
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText("Couldn't load your applications")).toBeTruthy();
    expect(screen.getByText("Server said no")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Your line is empty")).toBeTruthy();
  });

  it("explains network failures in plain language", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    renderApp();
    expect(await screen.findByText(/can't reach the server/i)).toBeTruthy();
  });
});

