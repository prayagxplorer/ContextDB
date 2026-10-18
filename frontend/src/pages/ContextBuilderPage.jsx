import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Layers, Play } from "lucide-react";
import { useWorkspace } from "../components/layout/AppShell";
import { api, params } from "../services/apiClient";
import { MEMORY_TYPES } from "../lib/constants";
import {
  Badge,
  Empty,
  Field,
  Heading,
  Options,
} from "../components/common/Common";
import { Button } from "../components/ui/button";
export default function ContextBuilderPage() {
  const { project, projects, version } = useWorkspace(),
    [selected, setSelected] = useState(project),
    [type, setType] = useState(""),
    [importance, setImportance] = useState(1),
    [limit, setLimit] = useState(5);
  const [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    setSelected(project);
    setResult(null);
    setCopied(false);
  }, [project]);
  useEffect(() => {
    setResult(null);
    setCopied(false);
  }, [selected, type, importance, limit, version]);
  async function build(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setCopied(false);
    setResult(null);
    try {
      setResult(
        await api(
          `/context-builder/${selected}` +
            params({ memory_type: type, min_importance: importance, limit }),
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(result.llm_context_prompt);
      setCopied(true);
    } catch {
      setError(
        "Clipboard access is unavailable. Select and copy the prompt below.",
      );
    }
  }
  return (
    <>
      <Heading
        eyebrow="Context workspace"
        title="Build a better starting point."
        description="Turn stored project knowledge into a focused, copyable context bundle."
      />
      <form className="panel context-controls" onSubmit={build}>
        <div className="filters">
          <Field label="Project">
            <select
              required
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={busy}
            >
              <option value="">Choose a project</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Memory type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={busy}
            >
              <option value="">All types</option>
              <Options values={MEMORY_TYPES} />
            </select>
          </Field>
          <Field label="Minimum importance">
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              disabled={busy}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </Field>
          <Field label="Memory limit">
            <input
              type="number"
              min="1"
              max="20"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              disabled={busy}
            />
          </Field>
          <Button disabled={busy || !selected}>
            <Play size={15} />
            {busy ? "Building…" : "Build context"}
          </Button>
        </div>
        <div className="formula">
          <Layers size={16} />
          <span>Deterministic ranking</span>
          <code>importance × 10 + tag count × 5</code>
          <span className="muted">Ties use memory ID. No LLM call.</span>
        </div>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!result && !busy && (
        <div className="context-placeholder">
          <Layers size={36} />
          <h2>The right knowledge, in the right order.</h2>
          <p>
            Choose a project and build context to see which memories rank
            highest, why they were selected, and the assembled prompt.
          </p>
        </div>
      )}
      {busy && (
        <p role="status" className="loading">
          Retrieving and ranking project memories…
        </p>
      )}
      {result && (
        <div className="context-columns">
          <section className="panel">
            <div className="panel-heading">
              <h2>Selected knowledge</h2>
              <span className="count-label">
                {result.memories.length} memories
              </span>
            </div>
            {result.memories.length ? (
              <ol className="ranked-list">
                {result.memories.map((m, i) => (
                  <li key={m.memory_id}>
                    <div className="rank-number">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="rank-content">
                      <Badge value={m.memory_type} />
                      <h3>
                        <Link
                          to={`/memories/${m.memory_id}?project=${selected}`}
                        >
                          {m.title}
                        </Link>
                      </h3>
                      <p>{m.content}</p>
                      <small>
                        Importance {m.importance} × 10 + {m.tag_count} tags × 5
                      </small>
                    </div>
                    <div className="score">
                      <strong>{m.relevance_score}</strong>
                      <span>score</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="No memories match these filters">
                Add knowledge to this project or broaden your filters.
              </Empty>
            )}
          </section>
          <section className="panel prompt-panel">
            <div className="panel-heading">
              <h2>Context prompt</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={copy}
                disabled={!result.memories.length}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span role="status">{copied ? "Copied" : "Copy context"}</span>
              </Button>
            </div>
            <label className="sr-only" htmlFor="context-prompt">
              Assembled context prompt
            </label>
            <textarea
              id="context-prompt"
              className="prompt-text"
              readOnly
              value={result.llm_context_prompt}
            />
            <p className="panel-note">
              Ready to paste into your preferred LLM workflow. This is retrieved
              knowledge, not an AI response.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
