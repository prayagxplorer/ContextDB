import { createContext, useContext, useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  BookOpen,
  Boxes,
  CircleHelp,
  Database,
  FileText,
  Folder,
  LayoutDashboard,
  ListChecks,
  Menu,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useResource } from "../../hooks/useResource";
import { Button } from "../ui/button";
const Workspace = createContext(null);
export const useWorkspace = () => useContext(Workspace);
const navigation = [
  ["/", "Overview", LayoutDashboard],
  ["/projects", "Projects", Folder],
  ["/memories", "Memories", BookOpen],
  ["/tasks", "Tasks", ListChecks],
  ["/agents", "Agents", Users],
  ["/sessions", "Sessions", FileText],
  ["/context", "Context Builder", Boxes],
];
export default function AppShell() {
  const [search, setSearch] = useSearchParams();
  const project = search.get("project") || "";
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const projects = useResource("/projects", version);
  const health = useResource("/health", version);
  const location = useLocation();
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const refresh = (message) => {
    setVersion((v) => v + 1);
    if (message) setNotice(message);
  };
  return (
    <Workspace.Provider
      value={{
        project,
        projects: projects.data || [],
        version,
        refresh,
        notify: setNotice,
      }}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Database size={20} />
          </span>
          <div>
            ContextDB<small>PROJECT MEMORY</small>
          </div>
          <button
            className="mobile-only icon-button"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </button>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={`${path}${project ? `?project=${project}` : ""}`}
              end={path === "/"}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection">
            <span className={`status-dot ${health.data ? "connected" : ""}`} />
            {health.loading
              ? "Checking Oracle…"
              : health.data
                ? "Oracle connected"
                : "Oracle unavailable"}
          </div>
          <p>
            Knowledge that outlasts
            <br />
            the conversation.
          </p>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            <CircleHelp size={15} /> API reference
          </a>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-only icon-button"
            aria-label="Open navigation"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {navigation.find(([p]) =>
                p === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(p),
              )?.[1] || "Record detail"}
            </strong>
          </div>
          <div className="header-actions">
            <label className="sr-only" htmlFor="workspace-project">
              Current project
            </label>
            <select
              id="workspace-project"
              value={project}
              onChange={(e) =>
                setSearch(e.target.value ? { project: e.target.value } : {})
              }
            >
              <option value="">All projects</option>
              {projects.data?.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              onClick={() => refresh()}
              aria-label="Refresh records"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </header>
        <main id="main-content">
          {health.error && (
            <div className="connection-banner" role="alert">
              Oracle connection unavailable. Start your database and check
              backend/.env. Records will appear after you select Refresh.
            </div>
          )}
          <Outlet key={project} />
        </main>
        <footer className="app-footer">
          <span>ContextDB / Persistent project knowledge</span>
          <span>Stored records · Rule-based retrieval</span>
        </footer>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </Workspace.Provider>
  );
}
