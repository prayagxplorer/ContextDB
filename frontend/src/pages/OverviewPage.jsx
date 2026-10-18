import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import { useWorkspace } from "../components/layout/AppShell";
import { useResource } from "../hooks/useResource";
import { params } from "../services/apiClient";
import { date } from "../lib/constants";
import { Badge, Empty, Heading, Resource } from "../components/common/Common";
import { Button } from "../components/ui/button";
import MemoryEditor from "../components/MemoryEditor";
export default function OverviewPage() {
  const { project, version } = useWorkspace(),
    state = useResource("/overview" + params({ project_id: project }), version),
    [editor, setEditor] = useState(false);
  return (
    <>
      <Heading
        eyebrow="Your project, in context"
        title="Workspace overview"
        description="Pick up where you left off. Keep the decisions that matter."
        action={
          <Button onClick={() => setEditor(true)}>
            <Plus size={16} />
            New memory
          </Button>
        }
      />
      <Resource state={state}>
        {(data) => (
          <>
            <div className="stat-strip overview-stats">
              {[
                ["Projects", data.counts.projects],
                ["Active projects", data.counts.active_projects],
                ["Open tasks", data.counts.open_tasks],
                ["Stored memories", data.counts.memories],
              ].map(([label, count]) => (
                <div key={label}>
                  <strong>{count}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <section className="context-callout">
              <div>
                <p className="eyebrow">CONTINUITY, BY DESIGN</p>
                <h2>Your next conversation starts here.</h2>
                <p>
                  Assemble the most important project knowledge into a readable
                  context bundle.
                </p>
              </div>
              <Button asChild>
                <Link to={`/context${project ? `?project=${project}` : ""}`}>
                  Build context
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </section>
            <div className="overview-columns">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Recent knowledge</h2>
                  <Link to={`/memories${project ? `?project=${project}` : ""}`}>
                    View library
                    <ArrowRight size={14} />
                  </Link>
                </div>
                {data.recent_memories.length ? (
                  <div className="activity-list">
                    {data.recent_memories.map((m) => (
                      <Link
                        key={m.memory_id}
                        to={`/memories/${m.memory_id}?project=${m.project_id}`}
                      >
                        <div>
                          <Badge value={m.memory_type} />
                          <h3>{m.title}</h3>
                          <p>
                            {m.project_name} · {date(m.updated_at)}
                          </p>
                        </div>
                        <ArrowRight size={16} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Empty title="Your library is ready for its first memory" />
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Project focus</h2>
                  <Link to="/projects">
                    All projects
                    <ArrowRight size={14} />
                  </Link>
                </div>
                {data.projects.length ? (
                  <div className="focus-list">
                    {[...data.projects]
                      .sort((a, b) => b.open_task_count - a.open_task_count)
                      .slice(0, 5)
                      .map((p) => (
                        <Link
                          key={p.project_id}
                          to={`/projects/${p.project_id}?project=${p.project_id}`}
                        >
                          <span>
                            <strong>{p.project_name}</strong>
                            <small>{p.memory_count} memories</small>
                          </span>
                          <span>
                            {p.open_task_count}
                            <small>open tasks</small>
                          </span>
                        </Link>
                      ))}
                  </div>
                ) : (
                  <Empty title="Create a project to begin" />
                )}
                <div className="panel-note">
                  Blocked tasks count as open work.
                </div>
              </section>
            </div>
            <section className="panel session-summary">
              <div className="panel-heading">
                <h2>Recent sessions</h2>
                <Link to={`/sessions${project ? `?project=${project}` : ""}`}>
                  Session history
                  <ArrowRight size={14} />
                </Link>
              </div>
              {data.recent_sessions.length ? (
                <div className="session-grid">
                  {data.recent_sessions.map((s) => (
                    <Link
                      key={s.session_id}
                      to={`/sessions/${s.session_id}?project=${s.project_id}`}
                    >
                      <span className="mono">S-{s.session_id}</span>
                      <strong>{s.agent_name}</strong>
                      <span>{s.project_name}</span>
                      <Badge value={s.status} />
                      <small>{date(s.start_time)}</small>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty title="No recorded sessions" />
              )}
            </section>
          </>
        )}
      </Resource>
      {editor && <MemoryEditor onClose={() => setEditor(false)} />}
    </>
  );
}
