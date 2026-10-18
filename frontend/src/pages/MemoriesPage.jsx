import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useWorkspace } from "../components/layout/AppShell";
import { useResource } from "../hooks/useResource";
import { api, params } from "../services/apiClient";
import { MEMORY_TYPES, date } from "../lib/constants";
import {
  Badge,
  ConfirmDialog,
  Field,
  Heading,
  Options,
  Pager,
  Resource,
} from "../components/common/Common";
import { MemoryRows } from "../components/common/RecordTables";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import MemoryEditor from "../components/MemoryEditor";
export function MemoryDetail({ memory, onClose, onEdit, onDelete }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={memory.title}
      description={`${memory.project_name} · M-${memory.memory_id}`}
    >
      <div className="detail-body">
        <div className="row">
          <Badge value={memory.memory_type} />
          <span>Importance {memory.importance} / 5</span>
          <span>Score {memory.relevance_score}</span>
        </div>
        <p className="knowledge-text">{memory.content}</p>
        <div className="tags">
          {memory.tags?.map((t) => (
            <span className="tag" key={t.tag_id}>
              {t.tag_name}
            </span>
          ))}
        </div>
        <dl className="detail-grid">
          <div>
            <dt>Related task</dt>
            <dd>
              {memory.task_id ? (
                <Link
                  to={`/tasks/${memory.task_id}?project=${memory.project_id}`}
                  onClick={onClose}
                >
                  T-{memory.task_id}
                </Link>
              ) : (
                "Project-wide"
              )}
            </dd>
          </div>
          <div>
            <dt>Source session</dt>
            <dd>
              {memory.session_id ? (
                <Link
                  to={`/sessions/${memory.session_id}?project=${memory.project_id}`}
                  onClick={onClose}
                >
                  S-{memory.session_id}
                </Link>
              ) : (
                "Not associated"
              )}
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{date(memory.updated_at)}</dd>
          </div>
        </dl>
        <div className="form-actions">
          <Button variant="ghost" onClick={onDelete}>
            <Trash2 size={16} />
            Delete
          </Button>
          <Button onClick={onEdit}>
            <Pencil size={16} />
            Edit memory
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
export default function MemoriesPage() {
  const { project, version, refresh } = useWorkspace(),
    [filters, setFilters] = useState({
      keyword: "",
      memory_type: "",
      min_importance: "",
      tag_id: "",
      sort: "recent",
    }),
    [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null),
    [editor, setEditor] = useState(null),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const state = useResource(
      "/memories" +
        params({ project_id: project, ...filters, limit: 25, offset }),
      version,
    ),
    tags = useResource("/tags");
  const change = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setOffset(0);
  };
  async function remove() {
    setBusy(true);
    try {
      await api(`/memories/${deleting.memory_id}`, { method: "DELETE" });
      setDeleting(null);
      refresh("Memory deleted");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="Knowledge library"
        title="Memories"
        description="Decisions, constraints, and discoveries. Ready for your next conversation."
        action={
          <Button onClick={() => setEditor({})}>
            <Plus size={16} />
            New memory
          </Button>
        }
      />
      <div className="filters">
        <Field label="Search memories">
          <input
            type="search"
            placeholder="Search title and knowledge…"
            value={filters.keyword}
            onChange={(e) => change("keyword", e.target.value)}
          />
        </Field>
        <Field label="Type">
          <select
            value={filters.memory_type}
            onChange={(e) => change("memory_type", e.target.value)}
          >
            <option value="">All types</option>
            <Options values={MEMORY_TYPES} />
          </select>
        </Field>
        <Field label="Importance">
          <select
            value={filters.min_importance}
            onChange={(e) => change("min_importance", e.target.value)}
          >
            <option value="">Any importance</option>
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+ importance
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tag">
          <select
            value={filters.tag_id}
            onChange={(e) => change("tag_id", e.target.value)}
          >
            <option value="">All tags</option>
            {tags.data?.map((t) => (
              <option key={t.tag_id} value={t.tag_id}>
                {t.tag_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sort">
          <select
            value={filters.sort}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="recent">Recently modified</option>
            <option value="relevance">Relevance score</option>
            <option value="title">Title A–Z</option>
          </select>
        </Field>
      </div>
      <section className="panel">
        <Resource state={state}>
          {(data) => (
            <>
              <MemoryRows items={data} onOpen={setSelected} />
              <Pager
                offset={offset}
                setOffset={setOffset}
                count={data.length}
              />
            </>
          )}
        </Resource>
      </section>
      {selected && (
        <MemoryDetail
          memory={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditor(selected);
            setSelected(null);
          }}
          onDelete={() => {
            setDeleting(selected);
            setSelected(null);
            setError("");
          }}
        />
      )}
      {editor && (
        <MemoryEditor
          memory={editor.memory_id ? editor : null}
          onClose={() => setEditor(null)}
        />
      )}
      <ConfirmDialog
        item={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
        error={error}
        description="This permanently deletes the memory and its tag mappings. Tags, tasks, and sessions are kept."
      />
    </>
  );
}
export function MemoryRoute() {
  const { memoryId } = useParams(),
    { version, refresh } = useWorkspace(),
    [edit, setEdit] = useState(false);
  const state = useResource(`/memories/${memoryId}`, version);
  return (
    <Resource state={state}>
      {(m) => (
        <>
          <Heading
            title={m.title}
            description={`${m.project_name} · Memory M-${m.memory_id}`}
            action={<Button onClick={() => setEdit(true)}>Edit memory</Button>}
          />
          <article className="panel detail-body">
            <Badge value={m.memory_type} />
            <p className="knowledge-text">{m.content}</p>
            <p>
              Importance {m.importance}/5 · Score {m.relevance_score}
            </p>
            <Link to={`/memories?project=${m.project_id}`}>
              Open memory library
            </Link>
          </article>
          {edit && (
            <MemoryEditor
              memory={m}
              onClose={() => {
                setEdit(false);
                refresh();
              }}
            />
          )}
        </>
      )}
    </Resource>
  );
}
