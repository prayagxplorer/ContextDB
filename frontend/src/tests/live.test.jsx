/** Real React -> HTTP -> Oracle workflow; opt in with RUN_LIVE_TESTS=1.
 * Uses jsdom (no visual-layout claim) and a running API on localhost:8000.
 */
import React from "react";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../App";
const originalFetch = globalThis.fetch;
const host = process.env.LIVE_API_URL || "http://127.0.0.1:8000";
async function request(path, method = "GET", body) {
  const r = await originalFetch(host + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
describe.skipIf(process.env.RUN_LIVE_TESTS !== "1")(
  "Live Oracle-backed React workflow",
  () => {
    let project, task, agent;
    beforeAll(async () => {
      project = await request("/projects", "POST", {
        project_name: `React verification ${Date.now()}`,
        description: "Temporary integrated UI test",
      });
      agent = (await request("/agents"))[0];
      task = await request("/tasks", "POST", {
        project_id: project.project_id,
        title: "Live task",
        description: "Procedure integration",
      });
      vi.stubGlobal("fetch", (url, options) =>
        originalFetch(new URL(url, host), options),
      );
    });
    afterAll(async () => {
      vi.unstubAllGlobals();
      if (project) await request(`/projects/${project.project_id}`, "DELETE");
    });
    it("creates, edits, ranks, copies and deletes knowledge through HTTP", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter
          initialEntries={[`/memories?project=${project.project_id}`]}
        >
          <AppRoutes />
        </MemoryRouter>,
      );
      await screen.findByRole("option", { name: project.project_name });
      await user.click(screen.getByRole("button", { name: "New memory" }));
      const dialog = screen.getByRole("dialog");
      await user.type(within(dialog).getByLabelText("Title"), "Live memory");
      await user.type(
        within(dialog).getByLabelText("Knowledge", { exact: false }),
        "Keep project knowledge in Oracle.",
      );
      await user.click(await within(dialog).findByLabelText("oracle"));
      await user.selectOptions(
        within(dialog).getByLabelText("Related task"),
        String(task.task_id),
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Save memory" }),
      );
      await user.click(
        await screen.findByRole("button", { name: "Live memory" }),
      );
      await user.click(screen.getByRole("button", { name: "Edit memory" }));
      await user.clear(screen.getByLabelText("Knowledge", { exact: false }));
      await user.type(
        screen.getByLabelText("Knowledge", { exact: false }),
        "Edited knowledge from the live React flow.",
      );
      await user.click(screen.getByRole("button", { name: "Save memory" }));
      await screen.findByText("Memory updated");
      await user.click(screen.getByRole("link", { name: "Context Builder" }));
      await user.click(screen.getByRole("button", { name: "Build context" }));
      expect(
        (await screen.findByLabelText("Assembled context prompt")).value,
      ).toContain("Edited knowledge from the live React flow.");
      const copy = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue();
      await user.click(screen.getByRole("button", { name: "Copy context" }));
      expect(copy).toHaveBeenCalledWith(
        expect.stringContaining("Edited knowledge from the live React flow."),
      );
      await user.click(
        screen.getByRole("link", { name: "Memories", exact: true }),
      );
      await user.click(
        await screen.findByRole("button", { name: "Live memory" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Delete", exact: true }),
      );
      await user.click(screen.getByRole("button", { name: "Delete record" }));
      await screen.findByText("Memory deleted");
      expect(
        await request(`/memories?project_id=${project.project_id}`),
      ).toEqual([]);
    }, 15000);
    it("assigns and completes a task via stored procedures", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter
          initialEntries={[
            `/tasks/${task.task_id}?project=${project.project_id}`,
          ]}
        >
          <AppRoutes />
        </MemoryRouter>,
      );
      await user.click(
        await screen.findByRole("button", { name: "Edit task" }),
      );
      await user.selectOptions(screen.getByLabelText("Status"), "COMPLETED");
      await within(screen.getByLabelText("Assigned agent")).findByRole(
        "option",
        { name: agent.agent_name },
      );
      await user.selectOptions(
        screen.getByLabelText("Assigned agent"),
        String(agent.agent_id),
      );
      await user.click(screen.getByRole("button", { name: "Save task" }));
      await screen.findByText("Task updated");
      const record = await request(`/tasks/${task.task_id}`);
      expect(record.status).toBe("COMPLETED");
      expect(record.agent_id).toBe(agent.agent_id);
      expect(record.completed_at).toBeTruthy();
    }, 10000);
  },
);
