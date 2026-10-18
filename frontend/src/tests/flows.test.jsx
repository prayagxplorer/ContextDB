import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../App";

const project = {
  project_id: 1,
  project_name: "Test project",
  description: "Project knowledge",
  status: "ACTIVE",
  task_count: 1,
  memory_count: 1,
  open_task_count: 1,
};
const memory = {
  memory_id: 1,
  project_id: 1,
  project_name: "Test project",
  title: "Oracle decision",
  content: "Use Oracle.",
  memory_type: "DECISION",
  importance: 5,
  tag_ids: [1],
  tags: [{ tag_id: 1, tag_name: "oracle" }],
  tag_count: 1,
  relevance_score: 55,
  updated_at: "2026-01-01T00:00:00Z",
};
const task = {
  task_id: 1,
  project_id: 1,
  project_name: "Test project",
  title: "Write tests",
  description: "Cover APIs",
  priority: "HIGH",
  status: "OPEN",
  agent_id: null,
  memories: [],
};
let requests, memories, tasks, unavailable;
function mount(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  requests = [];
  memories = [structuredClone(memory)];
  tasks = [structuredClone(task)];
  unavailable = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, options = {}) => {
      const parsed = new URL(url, "http://localhost"),
        path = parsed.pathname.replace("/api", ""),
        method = options.method || "GET",
        body = options.body ? JSON.parse(options.body) : null;
      requests.push({ path, method, body });
      let result = {};
      if (unavailable)
        return {
          ok: false,
          json: async () => ({ detail: "Oracle unavailable" }),
        };
      if (path === "/health") result = { status: "ok" };
      else if (path === "/projects") result = [project];
      else if (path === "/tags")
        result = [
          { tag_id: 1, tag_name: "oracle" },
          { tag_id: 2, tag_name: "api" },
        ];
      else if (path === "/agents")
        result = [
          {
            agent_id: 1,
            agent_name: "Atlas",
            model_name: "Model",
            model_version: "1",
          },
        ];
      else if (path === "/agents/1")
        result = {
          agent_id: 1,
          agent_name: "Atlas",
          model_name: "Model",
          model_version: "1",
          tasks,
          sessions: [],
          memories,
        };
      else if (path === "/sessions") result = [];
      else if (path === "/tasks" && method === "GET") result = tasks;
      else if (path === "/tasks/1" && method === "GET") result = tasks[0];
      else if (path === "/tasks/1" && method === "PATCH") {
        tasks[0] = { ...tasks[0], ...body };
        result = tasks[0];
      } else if (path === "/memories" && method === "GET")
        result =
          parsed.searchParams.get("keyword") === "missing" ? [] : memories;
      else if (path === "/memories" && method === "POST") {
        const m = { ...memory, ...body, memory_id: 2 };
        memories.push(m);
        result = m;
      } else if (path === "/memories/1" && method === "PATCH") {
        memories[0] = { ...memories[0], ...body };
        result = memories[0];
      } else if (path === "/memories/1" && method === "DELETE") {
        memories = [];
        result = { deleted_memory_id: 1 };
      } else if (path === "/context-builder/1")
        result = {
          project_id: 1,
          memories,
          llm_context_prompt: "Project context: Test project\nUse Oracle.",
        };
      return { ok: true, json: async () => result };
    }),
  );
});
describe("Core workflows", () => {
  it("creates a memory with tags", async () => {
    const user = userEvent.setup();
    mount("/memories?project=1");
    await screen.findByText("Oracle decision");
    await user.click(screen.getByRole("button", { name: "New memory" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Title"), "A new rule");
    await user.type(
      within(dialog).getByLabelText("Knowledge", { exact: false }),
      "Use bound parameters",
    );
    await user.click(within(dialog).getByLabelText("api"));
    await user.click(
      within(dialog).getByRole("button", { name: "Save memory" }),
    );
    await screen.findByText("Memory saved");
    expect(requests.find((r) => r.method === "POST").body).toMatchObject({
      project_id: 1,
      title: "A new rule",
      tag_ids: [2],
    });
  });
  it("edits a memory and reflects the response", async () => {
    const user = userEvent.setup();
    mount("/memories?project=1");
    await user.click(
      await screen.findByRole("button", { name: "Oracle decision" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit memory" }));
    const input = screen.getByLabelText("Title");
    await user.clear(input);
    await user.type(input, "Updated decision");
    await user.click(screen.getByRole("button", { name: "Save memory" }));
    await screen.findByText("Memory updated");
    expect(
      await screen.findByRole("button", { name: "Updated decision" }),
    ).toBeVisible();
  });
  it("requires confirmation to delete a memory", async () => {
    const user = userEvent.setup();
    mount("/memories");
    await user.click(
      await screen.findByRole("button", { name: "Oracle decision" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete", exact: true }),
    );
    expect(
      screen.getByText(/permanently deletes the memory and its tag mappings/),
    ).toBeVisible();
    expect(requests.some((r) => r.method === "DELETE")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Delete record" }));
    await screen.findByText("Memory deleted");
    expect(
      await screen.findByText("No memories match these filters"),
    ).toBeVisible();
  });
  it("changes task status and assignment", async () => {
    const user = userEvent.setup();
    mount("/tasks/1");
    await user.click(await screen.findByRole("button", { name: "Edit task" }));
    await user.selectOptions(screen.getByLabelText("Status"), "COMPLETED");
    await user.selectOptions(screen.getByLabelText("Assigned agent"), "1");
    await user.click(screen.getByRole("button", { name: "Save task" }));
    await screen.findByText("Task updated");
    expect(requests.find((r) => r.method === "PATCH").body).toMatchObject({
      status: "COMPLETED",
      agent_id: 1,
    });
  });
  it("loads agent detail and historical sections", async () => {
    const user = userEvent.setup();
    mount("/agents/1");
    expect(await screen.findByRole("heading", { name: "Atlas" })).toBeVisible();
    expect(screen.getByText("Write tests")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Sessions" }));
    expect(screen.getByText("No sessions recorded")).toBeVisible();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Knowledge" })).toHaveFocus();
    expect(screen.getByText("Oracle decision")).toBeVisible();
  });
  it("builds and copies deterministic context", async () => {
    const user = userEvent.setup();
    mount("/context?project=1");
    await screen.findAllByRole("option", { name: "Test project" });
    await user.click(screen.getByRole("button", { name: "Build context" }));
    await screen.findByText("Selected knowledge");
    expect(screen.getByText("55")).toBeVisible();
    const clipboard = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    await user.click(screen.getByRole("button", { name: "Copy context" }));
    expect(clipboard).toHaveBeenCalledWith(
      "Project context: Test project\nUse Oracle.",
    );
    expect(screen.getByText("Copied")).toBeVisible();
  });
  it("shows empty and server-error states honestly", async () => {
    const user = userEvent.setup();
    mount("/memories");
    await screen.findByText("Oracle decision");
    await user.type(screen.getByLabelText("Search memories"), "missing");
    expect(
      await screen.findByText("No memories match these filters"),
    ).toBeVisible();
    unavailable = true;
    await user.click(screen.getByRole("button", { name: "Refresh records" }));
    expect(await screen.findByText("Unable to load this view")).toBeVisible();
  });
  it("closes the editor with Escape", async () => {
    const user = userEvent.setup();
    mount("/memories");
    await user.click(screen.getByRole("button", { name: "New memory" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "New memory" })).toHaveFocus();
  });
});
