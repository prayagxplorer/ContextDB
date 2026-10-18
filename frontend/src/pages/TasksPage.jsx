import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useWorkspace } from "../components/layout/AppShell";
import { useResource } from "../hooks/useResource";
import { api, params } from "../services/apiClient";
import { PRIORITIES, TASK_STATUSES, date } from "../lib/constants";
import {
  Badge,
  ConfirmDialog,
  Field,
  Heading,
  Options,
  Pager,
  Resource,
} from "../components/common/Common";
import { TaskRows } from "../components/common/RecordTables";
import { Button } from "../components/ui/button";
import TaskEditor from "../components/TaskEditor";
export default function TasksPage() {
  const { project, version } = useWorkspace(),
    [filters, setFilters] = useState({
      status: "",
      priority: "",
      agent_id: "",
    }),
    [offset, setOffset] = useState(0),
    [editor, setEditor] = useState(null);
  const state = useResource(
      "/tasks" + params({ project_id: project, ...filters, offset, limit: 25 }),
      version,
    ),
    agents = useResource("/agents");
  const change = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setOffset(0);
  };
  return (
    <>
      <Heading
        eyebrow="Work register"
        title="Tasks"
        description="Prioritize the next step. Keep assignments and outcomes in one place."
        action={
          <Button onClick={() => setEditor({})}>
            <Plus size={16} />
            Add task
          </Button>
        }
      />
      <div className="filters">
        <Field label="Status">
          <select
            value={filters.status}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">All statuses</option>
            <Options values={TASK_STATUSES} />
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={filters.priority}
            onChange={(e) => change("priority", e.target.value)}
          >
            <option value="">All priorities</option>
            <Options values={PRIORITIES} />
          </select>
        </Field>
        <Field label="Assignee">
          <select
            value={filters.agent_id}
            onChange={(e) => change("agent_id", e.target.value)}
          >
            <option value="">All agents</option>
            {agents.data?.map((a) => (
              <option key={a.agent_id} value={a.agent_id}>
                {a.agent_name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <section className="panel">
        <Resource state={state}>
          {(data) => (
            <>
              <TaskRows items={data} />
              <Pager
                offset={offset}
                setOffset={setOffset}
                count={data.length}
              />
            </>
          )}
        </Resource>
      </section>
      {editor && (
        <TaskEditor
          task={editor.task_id ? editor : null}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
export function TaskDetailPage() {
  const { taskId } = useParams(),
    { version, refresh } = useWorkspace(),
    state = useResource(`/tasks/${taskId}`, version);
  const [edit, setEdit] = useState(false),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [deleted, setDeleted] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await api(`/tasks/${taskId}`, { method: "DELETE" });
      setDeleted(true);
      setDeleting(null);
      refresh("Task deleted");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (deleted)
    return (
      <>
        <Heading
          title="Task deleted"
          description="Related memories were preserved."
        />
        <Link to="/tasks">Back to tasks</Link>
      </>
    );
  return (
    <Resource state={state}>
      {(task) => (
        <>
          <Heading
            title={task.title}
            description={`${task.project_name} · T-${task.task_id}`}
            action={<Button onClick={() => setEdit(true)}>Edit task</Button>}
          />
          <section className="panel detail-body">
            <div className="row">
              <Badge value={task.status} />
              <Badge value={task.priority} />
            </div>
            <p className="knowledge-text">{task.description}</p>
            <dl className="detail-grid">
              <div>
                <dt>Assigned agent</dt>
                <dd>
                  {task.agent_id ? (
                    <Link to={`/agents/${task.agent_id}`}>
                      {task.agent_name}
                    </Link>
                  ) : (
                    "Unassigned"
                  )}
                </dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{date(task.completed_at)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{date(task.created_at)}</dd>
              </div>
            </dl>
            <h2>Related knowledge</h2>
            {task.memories.length ? (
              <ul className="link-list">
                {task.memories.map((m) => (
                  <li key={m.memory_id}>
                    <Link
                      to={`/memories/${m.memory_id}?project=${m.project_id}`}
                    >
                      {m.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                No memories are associated with this task yet.
              </p>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setDeleting(task);
                setError("");
              }}
            >
              Delete task
            </Button>
          </section>
          {edit && <TaskEditor task={task} onClose={() => setEdit(false)} />}
          <ConfirmDialog
            item={deleting}
            onClose={() => setDeleting(null)}
            onConfirm={remove}
            busy={busy}
            error={error}
            description="This deletes the task and clears its links from memories. Project knowledge is preserved."
          />
        </>
      )}
    </Resource>
  );
}
