import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import OverviewPage from "./pages/OverviewPage";
import ProjectsPage, { ProjectDetailPage } from "./pages/ProjectsPage";
import MemoriesPage, { MemoryRoute } from "./pages/MemoriesPage";
import TasksPage, { TaskDetailPage } from "./pages/TasksPage";
import AgentsPage, { AgentDetailPage } from "./pages/AgentsPage";
import SessionsPage, { SessionDetailPage } from "./pages/SessionsPage";
import ContextBuilderPage from "./pages/ContextBuilderPage";
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="memories" element={<MemoriesPage />} />
        <Route path="memories/:memoryId" element={<MemoryRoute />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:agentId" element={<AgentDetailPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/:sessionId" element={<SessionDetailPage />} />
        <Route path="context" element={<ContextBuilderPage />} />
        <Route
          path="*"
          element={
            <div className="empty">
              <h1>Page not found</h1>
              <Link to="/">Return to overview</Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
