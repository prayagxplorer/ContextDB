import { Link } from "react-router-dom";
import { Badge, Empty } from "./Common";
import { date } from "../../lib/constants";
export function MemoryRows({ items, onOpen }) {
  if (!items.length)
    return (
      <Empty title="No memories match these filters">
        Try a broader search, or save your first project memory.
      </Empty>
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Memory</th>
            <th>Type</th>
            <th>Importance</th>
            <th>Tags</th>
            <th>Modified</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.memory_id}>
              <td>
                <button
                  className="text-button record-title"
                  onClick={() => onOpen(m)}
                >
                  {m.title}
                </button>
                <small>
                  {m.project_name}{" "}
                  <span className="mono">/ M-{m.memory_id}</span>
                </small>
              </td>
              <td>
                <Badge value={m.memory_type} />
              </td>
              <td>
                <span className="importance">
                  {m.importance}
                  <span> / 5</span>
                </span>
              </td>
              <td>
                <div className="tags">
                  {m.tags?.length ? (
                    m.tags.map((t) => (
                      <span className="tag" key={t.tag_id}>
                        {t.tag_name}
                      </span>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
              </td>
              <td className="date-cell">{date(m.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function TaskRows({ items, onOpen }) {
  if (!items.length) return <Empty title="No tasks match these filters" />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned agent</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.task_id}>
              <td>
                {onOpen ? (
                  <button
                    className="text-button record-title"
                    onClick={() => onOpen(t)}
                  >
                    {t.title}
                  </button>
                ) : (
                  <Link
                    className="record-title"
                    to={`/tasks/${t.task_id}?project=${t.project_id}`}
                  >
                    {t.title}
                  </Link>
                )}
                <small>
                  {t.project_name} <span className="mono">/ T-{t.task_id}</span>
                </small>
              </td>
              <td>
                <Badge value={t.priority} />
              </td>
              <td>
                <Badge value={t.status} />
              </td>
              <td>
                {t.agent_id ? (
                  <Link to={`/agents/${t.agent_id}?project=${t.project_id}`}>
                    {t.agent_name}
                  </Link>
                ) : (
                  "Unassigned"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function SessionRows({ items }) {
  if (!items.length) return <Empty title="No sessions recorded" />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Session / project</th>
            <th>User / agent</th>
            <th>Stored status</th>
            <th>Started</th>
            <th>Ended</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.session_id}>
              <td>
                <Link to={`/sessions/${s.session_id}?project=${s.project_id}`}>
                  S-{s.session_id}
                </Link>
                <small>{s.project_name}</small>
              </td>
              <td>
                {s.user_name}
                <small>
                  <Link to={`/agents/${s.agent_id}?project=${s.project_id}`}>
                    {s.agent_name}
                  </Link>
                </small>
              </td>
              <td>
                <Badge value={s.status} />
              </td>
              <td className="date-cell">{date(s.start_time)}</td>
              <td className="date-cell">{date(s.end_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
