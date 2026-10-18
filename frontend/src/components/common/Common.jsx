import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Database, Loader2 } from "lucide-react";
import { human } from "../../lib/constants";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
export function Badge({ value }) {
  return (
    <span className={`badge badge-${value?.toLowerCase()}`}>
      {human(value)}
    </span>
  );
}
export function Heading({ eyebrow = "Workspace", title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function ErrorState({ error }) {
  return (
    <div role="alert" className="error">
      <AlertCircle size={18} />
      <div>
        <strong>Unable to load this view</strong>
        <p>{error}</p>
        <p>Check Oracle and FastAPI, then use Refresh or reload the page.</p>
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div role="status" className="loading">
      <Loader2 size={18} className="spin" />
      Loading project records…
    </div>
  );
}
export function Empty({ title = "Nothing here yet", children }) {
  return (
    <div className="empty">
      <Database size={26} />
      <h3>{title}</h3>
      <p>
        {children || "Choose another project or add a record to get started."}
      </p>
    </div>
  );
}
export function Resource({ state, children }) {
  return state.loading ? (
    <Loading />
  ) : state.error ? (
    <ErrorState error={state.error} />
  ) : (
    children(state.data)
  );
}
export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Options({ values }) {
  return values.map((value) => (
    <option key={value} value={value}>
      {human(value)}
    </option>
  ));
}
export function ProjectLink({ id, children }) {
  const [search] = useSearchParams();
  return (
    <Link
      to={`/projects/${id}?${new URLSearchParams({ ...Object.fromEntries(search), project: id })}`}
    >
      {children}
      <ArrowRight size={14} />
    </Link>
  );
}
export function Pager({ offset, setOffset, count, size = 25 }) {
  return (
    <div className="pager">
      <span>{count ? `${offset + 1}–${offset + count}` : "0"} records</span>
      <Button
        variant="outline"
        disabled={!offset}
        onClick={() => setOffset(Math.max(0, offset - size))}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        disabled={count < size}
        onClick={() => setOffset(offset + size)}
      >
        Next
      </Button>
    </div>
  );
}
export function ConfirmDialog({
  item,
  onClose,
  onConfirm,
  busy,
  error,
  description,
}) {
  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => !open && !busy && onClose()}
      title="Delete this record?"
      description={description}
    >
      <p className="confirm-name">{item?.title || item?.project_name}</p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete record"}
        </Button>
      </div>
    </Dialog>
  );
}
