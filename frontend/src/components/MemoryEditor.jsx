import { useState } from "react";
import { useResource } from "../hooks/useResource";
import { api, params } from "../services/apiClient";
import { MEMORY_TYPES } from "../lib/constants";
import { useWorkspace } from "./layout/AppShell";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { ErrorState, Field, Options } from "./common/Common";
export default function MemoryEditor({ memory, onClose }) {
  const { project, projects, refresh } = useWorkspace();
  const [values, setValues] = useState(
    memory || {
      project_id: project || "",
      title: "",
      content: "",
      memory_type: "FINDING",
      importance: 3,
      task_id: null,
      session_id: null,
      tag_ids: [],
    },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const tags = useResource("/tags"),
    tasks = useResource(
      values.project_id
        ? "/tasks" + params({ project_id: values.project_id, limit: 200 })
        : null,
    ),
    sessions = useResource(
      values.project_id
        ? "/sessions" + params({ project_id: values.project_id, limit: 200 })
        : null,
    );
  const change = (key, value) =>
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === "project_id" ? { task_id: null, session_id: null } : {}),
    }));
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      title: values.title,
      content: values.content,
      memory_type: values.memory_type,
      importance: Number(values.importance),
      task_id: values.task_id ? Number(values.task_id) : null,
      session_id: values.session_id ? Number(values.session_id) : null,
      tag_ids: values.tag_ids,
    };
    if (!memory) body.project_id = Number(values.project_id);
    try {
      await api(memory ? `/memories/${memory.memory_id}` : "/memories", {
        method: memory ? "PATCH" : "POST",
        body,
      });
      refresh(memory ? "Memory updated" : "Memory saved");
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
      title={memory ? "Edit memory" : "New memory"}
      description="Save reusable project knowledge. Task and session links are optional."
    >
      <form onSubmit={save} className="editor-form">
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Field label="Project">
          <select
            required
            disabled={!!memory}
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
            placeholder="What should this project remember?"
          />
        </Field>
        <div className="form-grid">
          <Field label="Memory type">
            <select
              value={values.memory_type}
              onChange={(e) => change("memory_type", e.target.value)}
            >
              <Options values={MEMORY_TYPES} />
            </select>
          </Field>
          <Field label="Importance">
            <select
              value={values.importance}
              onChange={(e) => change("importance", e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5{n === 5 ? " · Essential" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Knowledge"
          hint="Plain text · up to 1,000,000 characters. Include enough context to be useful later."
        >
          <textarea
            className="memory-content"
            required
            maxLength={1000000}
            value={values.content}
            onChange={(e) => change("content", e.target.value)}
            placeholder="Record the decision, its reasoning, and any constraints…"
          />
        </Field>
        <div className="form-grid">
          <Field label="Related task">
            <select
              value={values.task_id || ""}
              onChange={(e) => change("task_id", e.target.value)}
            >
              <option value="">Project-wide knowledge</option>
              {tasks.data?.map((t) => (
                <option key={t.task_id} value={t.task_id}>
                  {t.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source session">
            <select
              value={values.session_id || ""}
              onChange={(e) => change("session_id", e.target.value)}
            >
              <option value="">No session association</option>
              {sessions.data?.map((s) => (
                <option key={s.session_id} value={s.session_id}>
                  S-{s.session_id} · {s.agent_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {(tasks.error || sessions.error || tags.error) && (
          <ErrorState error={tasks.error || sessions.error || tags.error} />
        )}
        <fieldset>
          <legend>Tags</legend>
          <div className="tag-choices">
            {tags.loading
              ? "Loading tags…"
              : tags.data?.map((t) => (
                  <label key={t.tag_id}>
                    <input
                      type="checkbox"
                      checked={values.tag_ids.includes(t.tag_id)}
                      onChange={(e) =>
                        change(
                          "tag_ids",
                          e.target.checked
                            ? [...values.tag_ids, t.tag_id]
                            : values.tag_ids.filter((id) => id !== t.tag_id),
                        )
                      }
                    />
                    {t.tag_name}
                  </label>
                ))}
          </div>
        </fieldset>
        <p className="helper">
          Memories belong to projects. Agent relationships come from the
          selected task or session.
        </p>
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button disabled={busy}>{busy ? "Saving…" : "Save memory"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
