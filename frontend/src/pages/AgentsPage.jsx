import { Tabs } from "../components/common/Tabs";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { useWorkspace } from "../components/layout/AppShell";
import { useResource } from "../hooks/useResource";
import { Empty, Field, Heading, Resource } from "../components/common/Common";
import { TaskRows, SessionRows } from "../components/common/RecordTables";
export default function AgentsPage() {
  const { version } = useWorkspace(),
    state = useResource("/agents", version),
    [search, setSearch] = useState("");
  return (
    <>
      <Heading
        eyebrow="Participants"
        title="Agents"
        description="Model records and their project contributions. No live processes are represented here."
      />
      <div className="filters">
        <Field label="Search agents">
          <input
            type="search"
            placeholder="Name or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
      </div>
      <Resource state={state}>
        {(data) => {
          const agents = data.filter((a) =>
            `${a.agent_name} ${a.model_name}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          );
          return agents.length ? (
            <div className="agent-grid">
              {agents.map((a) => (
                <Link
                  className="agent-card"
                  key={a.agent_id}
                  to={`/agents/${a.agent_id}`}
                >
                  <div className="agent-icon">
                    <Users size={20} />
                    <span className="mono">A-{a.agent_id}</span>
                  </div>
                  <h2>{a.agent_name}</h2>
                  <p>
                    {a.model_name}{" "}
                    <span className="mono">/ {a.model_version}</span>
                  </p>
                  <div className="agent-counts">
                    <span>{a.task_count} assigned tasks</span>
                    <span>{a.session_count} sessions</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="No agents match your search" />
          );
        }}
      </Resource>
    </>
  );
}
export function AgentDetailPage() {
  const { agentId } = useParams(),
    { version } = useWorkspace(),
    state = useResource(`/agents/${agentId}`, version),
    [tab, setTab] = useState("Tasks");
  return (
    <Resource state={state}>
      {(a) => (
        <>
          <Heading
            eyebrow={`Agent record / A-${a.agent_id}`}
            title={a.agent_name}
            description={`${a.model_name} · Version ${a.model_version} · Historical records across all projects`}
          />
          <Tabs
            labels={["Tasks", "Sessions", "Knowledge"]}
            value={tab}
            onChange={setTab}
            label="Agent records"
          >
            {tab === "Tasks" && <TaskRows items={a.tasks} />}{" "}
            {tab === "Sessions" && <SessionRows items={a.sessions} />}{" "}
            {tab === "Knowledge" && (
              <div className="detail-body">
                <p className="muted">
                  Project knowledge linked through this agent’s tasks or
                  recorded sessions.
                </p>
                {a.memories.length ? (
                  <ul className="link-list">
                    {a.memories.map((m) => (
                      <li key={m.memory_id}>
                        <Link
                          to={`/memories/${m.memory_id}?project=${m.project_id}`}
                        >
                          {m.title}
                        </Link>
                        <small>{m.project_name}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty title="No associated knowledge" />
                )}
              </div>
            )}
          </Tabs>
          <p className="helper">
            Showing up to 200 records per section. An active session is a stored
            status, not evidence of a running agent.
          </p>
        </>
      )}
    </Resource>
  );
}
