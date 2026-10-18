import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWorkspace } from "../components/layout/AppShell";
import { useResource } from "../hooks/useResource";
import { params } from "../services/apiClient";
import { date } from "../lib/constants";
import {
  Badge,
  Field,
  Heading,
  Options,
  Pager,
  Resource,
} from "../components/common/Common";
import { SessionRows } from "../components/common/RecordTables";
export default function SessionsPage() {
  const { project, version } = useWorkspace(),
    [status, setStatus] = useState(""),
    [agent, setAgent] = useState(""),
    [offset, setOffset] = useState(0),
    agents = useResource("/agents"),
    state = useResource(
      "/sessions" +
        params({
          project_id: project,
          status,
          agent_id: agent,
          offset,
          limit: 25,
        }),
      version,
    );
  return (
    <>
      <Heading
        eyebrow="Recorded history"
        title="Sessions"
        description="Who worked on what, and when. “Active” is a stored session status."
      />
      <div className="filters">
        <Field label="Stored status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All statuses</option>
            <Options values={["ACTIVE", "COMPLETED", "ABORTED"]} />
          </select>
        </Field>
        <Field label="Agent">
          <select
            value={agent}
            onChange={(e) => {
              setAgent(e.target.value);
              setOffset(0);
            }}
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
              <SessionRows items={data} />
              <Pager
                offset={offset}
                setOffset={setOffset}
                count={data.length}
              />
            </>
          )}
        </Resource>
      </section>
    </>
  );
}
export function SessionDetailPage() {
  const { sessionId } = useParams(),
    state = useResource(`/sessions/${sessionId}`);
  return (
    <Resource state={state}>
      {(s) => (
        <>
          <Heading
            title={`Session S-${s.session_id}`}
            description="Historical session record. No execution controls."
          />
          <section className="panel detail-body">
            <Badge value={s.status} />
            <dl className="detail-grid">
              <div>
                <dt>Project</dt>
                <dd>
                  <Link
                    to={`/projects/${s.project_id}?project=${s.project_id}`}
                  >
                    {s.project_name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>User</dt>
                <dd>{s.user_name}</dd>
              </div>
              <div>
                <dt>Agent</dt>
                <dd>
                  <Link to={`/agents/${s.agent_id}`}>{s.agent_name}</Link>
                </dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>{date(s.start_time)}</dd>
              </div>
              <div>
                <dt>Ended</dt>
                <dd>{date(s.end_time)}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </Resource>
  );
}
