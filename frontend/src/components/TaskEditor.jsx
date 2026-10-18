import { useState } from "react";
import { useWorkspace } from "./layout/AppShell";
import { useResource } from "../hooks/useResource";
import { api } from "../services/apiClient";
import { PRIORITIES, TASK_STATUSES } from "../lib/constants";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Field, Options, ErrorState } from "./common/Common";
export default function TaskEditor({ task, onClose }) {
  const { project, projects, refresh } = useWorkspace(),
    agents = useResource("/agents");
  const [values, setValues] = useState(
      task || {
        project_id: project || "",
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "OPEN",
        agent_id: "",
      },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      status: values.status,
      agent_id: values.agent_id ? Number(values.agent_id) : null,
    };
    if (!task) body.project_id = Number(values.project_id);
    try {
      await api(task ? `/tasks/${task.task_id}` : "/tasks", {
        method: task ? "PATCH" : "POST",
        body,
      });
      refresh(task ? "Task updated" : "Task created");
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={task ? "Edit task" : "Add task"}
      description="Track work and assign an agent record. Assignment does not execute the task."
    >
      <form className="editor-form" onSubmit={save}>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Field label="Project">
          <select
            required
            disabled={!!task}
            value={values.project_id}
            onChange={(e) => change("project_id", e.target.value)}
          >
            <option value="">Select a project</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input
            required
            maxLength={200}
            value={values.title}
            onChange={(e) => change("title", e.target.value)}
          />
        </Field>
        <Field label="Description">
          <textarea
            required
            maxLength={1000}
            value={values.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Priority">
            <select
              value={values.priority}
              onChange={(e) => change("priority", e.target.value)}
            >
              <Options values={PRIORITIES} />
            </select>
          </Field>
          <Field label="Status">
            <select
              value={values.status}
              onChange={(e) => change("status", e.target.value)}
            >
              <Options values={TASK_STATUSES} />
            </select>
          </Field>
        </div>
        <Field label="Assigned agent">
          <select
            value={values.agent_id || ""}
            onChange={(e) => change("agent_id", e.target.value)}
          >
            <option value="">Unassigned</option>
            {agents.data?.map((a) => (
              <option key={a.agent_id} value={a.agent_id}>
                {a.agent_name}
              </option>
            ))}
          </select>
        </Field>
        {agents.error && <ErrorState error={agents.error} />}
        <p className="helper">
          Completing a task records its completion time. Reopening it clears
          that timestamp.
        </p>
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button disabled={busy}>{busy ? "Saving…" : "Save task"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
