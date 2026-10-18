import { Tabs } from "../components/common/Tabs";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "../components/layout/AppShell";
import { useResource } from "../hooks/useResource";
import { api, params } from "../services/apiClient";
import { PROJECT_STATUSES } from "../lib/constants";
import {
  Badge,
  ConfirmDialog,
  Empty,
  Field,
  Heading,
  Options,
  Resource,
} from "../components/common/Common";
import { TaskRows, SessionRows } from "../components/common/RecordTables";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
function ProjectEditor({ project, onClose }) {
  const { refresh } = useWorkspace(),
    [values, setValues] = useState(
      project || { project_name: "", description: "", status: "ACTIVE" },
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(project ? `/projects/${project.project_id}` : "/projects", {
        method: project ? "PATCH" : "POST",
        body: {
          project_name: values.project_name,
          description: values.description,
          status: values.status,
        },
      });
      refresh(project ? "Project updated" : "Project created");
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
      title={project ? "Edit project" : "New project"}
      description="A shared home for tasks, sessions, and durable knowledge."
    >
      <form className="editor-form" onSubmit={save}>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Field label="Project name">
          <input
            required
            maxLength={150}
            value={values.project_name}
            onChange={(e) =>
              setValues((v) => ({ ...v, project_name: e.target.value }))
            }
          />
        </Field>
        <Field label="Description">
          <textarea
            required
            maxLength={1000}
            value={values.description}
            onChange={(e) =>
              setValues((v) => ({ ...v, description: e.target.value }))
            }
          />
        </Field>
        <Field label="Status">
          <select
            value={values.status}
            onChange={(e) =>
              setValues((v) => ({ ...v, status: e.target.value }))
            }
          >
            <Options values={PROJECT_STATUSES} />
          </select>
        </Field>
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button disabled={busy}>{busy ? "Saving…" : "Save project"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
export default function ProjectsPage() {
  const { version } = useWorkspace(),
    state = useResource("/projects", version),
    [search, setSearch] = useState(""),
    [editor, setEditor] = useState(false),
    [sort, setSort] = useState("name");
  return (
    <>
      <Heading
        eyebrow="Project directory"
        title="Projects"
        description="A clear boundary for every body of work."
        action={
          <Button onClick={() => setEditor(true)}>
            <Plus size={16} />
            New project
          </Button>
        }
      />
      <div className="filters">
        <Field label="Search projects">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a project…"
          />
        </Field>
        <Field label="Sort">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Name A–Z</option>
            <option value="tasks">Most open tasks</option>
            <option value="memories">Most memories</option>
          </select>
        </Field>
      </div>
      <section className="panel">
        <Resource state={state}>
          {(data) => {
            const projects = data
              .filter((p) =>
                p.project_name.toLowerCase().includes(search.toLowerCase()),
              )
              .sort((a, b) =>
                sort === "name"
                  ? a.project_name.localeCompare(b.project_name)
                  : sort === "tasks"
                    ? b.open_task_count - a.open_task_count
                    : b.memory_count - a.memory_count,
              );
            return projects.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Open / total tasks</th>
                      <th>Memories</th>
                      <th>
                        <span className="sr-only">View</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.project_id}>
                        <td>
                          <Link
                            className="record-title"
                            to={`/projects/${p.project_id}?project=${p.project_id}`}
                          >
                            {p.project_name}
                          </Link>
                          <small>{p.description}</small>
                        </td>
                        <td>
                          <Badge value={p.status} />
                        </td>
                        <td>
                          {p.open_task_count} / {p.task_count}
                        </td>
                        <td>{p.memory_count}</td>
                        <td>
                          <Link
                            aria-label={`View ${p.project_name}`}
                            to={`/projects/${p.project_id}?project=${p.project_id}`}
                          >
                            <ArrowUpRight size={18} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No projects match your search" />
            );
          }}
        </Resource>
      </section>
      {editor && <ProjectEditor onClose={() => setEditor(false)} />}
    </>
  );
}
export function ProjectDetailPage() {
  const { projectId } = useParams(),
    { version, refresh } = useWorkspace(),
    [tab, setTab] = useState("Overview"),
    [edit, setEdit] = useState(false),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [deleted, setDeleted] = useState(false);
  const state = useResource(`/projects/${projectId}`, version),
    tasks = useResource(
      "/tasks" + params({ project_id: projectId, limit: 200 }),
      version,
    ),
    sessions = useResource(
      "/sessions" + params({ project_id: projectId, limit: 200 }),
      version,
    ),
    memories = useResource(
      "/memories" + params({ project_id: projectId, limit: 200 }),
      version,
    );
  async function remove() {
    setBusy(true);
    try {
      await api(`/projects/${projectId}`, { method: "DELETE" });
      setDeleted(true);
      setDeleting(null);
      refresh("Project deleted");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (deleted)
    return (
      <>
        <Heading title="Project deleted" />
        <Link to="/projects">Back to projects</Link>
      </>
    );
  return (
    <Resource state={state}>
      {(p) => (
        <>
          <Heading
            title={p.project_name}
            description={p.description}
            action={<Button onClick={() => setEdit(true)}>Edit project</Button>}
          />
          <Tabs
            labels={["Overview", "Tasks", "Memories", "Sessions", "Agents"]}
            value={tab}
            onChange={setTab}
            label="Project details"
          >
            {tab === "Overview" && (
              <div className="detail-body">
                <Badge value={p.status} />
                <div className="stat-strip">
                  <div>
                    <strong>{p.open_task_count}</strong>
                    <span>Open tasks</span>
                  </div>
                  <div>
                    <strong>{p.task_count}</strong>
                    <span>Total tasks</span>
                  </div>
                  <div>
                    <strong>{p.memory_count}</strong>
                    <span>Stored memories</span>
                  </div>
                </div>
                <div className="row">
                  <Button asChild>
                    <Link to={`/context?project=${p.project_id}`}>
                      Build context
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/memories?project=${p.project_id}`}>
                      Manage memories
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDeleting(p);
                      setError("");
                    }}
                  >
                    Delete project
                  </Button>
                </div>
              </div>
            )}
            {tab === "Tasks" && (
              <Resource state={tasks}>
                {(items) => (
                  <>
                    <TaskRows items={items} />
                    <div className="panel-footer">
                      <Link to={`/tasks?project=${projectId}`}>
                        Manage all tasks
                      </Link>
                    </div>
                  </>
                )}
              </Resource>
            )}
            {tab === "Memories" && (
              <Resource state={memories}>
                {(items) => (
                  <div className="detail-body">
                    {items.length ? (
                      <ul className="link-list">
                        {items.map((m) => (
                          <li key={m.memory_id}>
                            <Link
                              to={`/memories/${m.memory_id}?project=${projectId}`}
                            >
                              {m.title}
                            </Link>
                            <Badge value={m.memory_type} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Empty title="No project memories yet" />
                    )}
                    <Link to={`/memories?project=${projectId}`}>
                      Manage all memories
                    </Link>
                  </div>
                )}
              </Resource>
            )}
            {tab === "Sessions" && (
              <Resource state={sessions}>
                {(items) => <SessionRows items={items} />}
              </Resource>
            )}
            {tab === "Agents" && (
              <Resource state={tasks}>
                {(taskItems) => (
                  <Resource state={sessions}>
                    {(sessionItems) => {
                      const agents = new Map(
                        [...taskItems, ...sessionItems]
                          .filter((r) => r.agent_id)
                          .map((r) => [r.agent_id, r.agent_name]),
                      );
                      return (
                        <div className="detail-body">
                          <p className="muted">
                            Participating through recorded tasks or sessions.
                          </p>
                          {agents.size ? (
                            <ul className="link-list">
                              {[...agents].map(([id, name]) => (
                                <li key={id}>
                                  <Link
                                    to={`/agents/${id}?project=${projectId}`}
                                  >
                                    {name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <Empty title="No associated agents" />
                          )}
                        </div>
                      );
                    }}
                  </Resource>
                )}
              </Resource>
            )}
          </Tabs>
          <p className="helper">
            Detail tabs show up to 200 recent records. Use the main lists for
            pagination.
          </p>
          {edit && <ProjectEditor project={p} onClose={() => setEdit(false)} />}
          <ConfirmDialog
            item={deleting}
            onClose={() => setDeleting(null)}
            onConfirm={remove}
            busy={busy}
            error={error}
            description="This permanently deletes the project, its tasks, sessions, memories, and memory-tag mappings. Users, agents, and tag definitions remain."
          />
        </>
      )}
    </Resource>
  );
}
