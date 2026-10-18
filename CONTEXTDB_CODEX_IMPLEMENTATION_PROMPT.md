# ContextDB — End-to-End Implementation Brief for Codex

> **Role:** You are the implementation engineer working inside my existing local `ContextDB` Git repository. Complete the application end-to-end, preserve the existing academic database work, and leave behind a project I can understand, run, demonstrate, and maintain.
>
> **Execution instruction:** This is a build task, not a request for another plan or a UI mockup. Inspect the repository and environment, make the necessary code changes, run the application and tests where the environment permits, fix problems, and summarize actual results. Proceed autonomously with reasonable decisions; ask only if an essential credential, permission, or unavailable runtime blocks progress. Do not claim tests or integration succeeded unless you actually ran them.

---

## 0. Understand the goal correctly

**Project:** ContextDB — Persistent Project Memory & Context Management System.

This is **project-centric knowledge and context management**, NOT an autonomous AI agent execution platform.

The product stores and retrieves structured knowledge that AI-assisted software-development projects accumulate over time: requirements, architecture decisions, constraints, rules, bugs, findings, solutions, tasks, tags, and session history. A user should be able to manage the data through a polished web interface, search and filter it, and build a ranked, readable context bundle for a selected project that they can copy into an LLM workflow.

**Do not** implement pretend AI agents, fake LLM execution, fake live activity feeds, stop/restart buttons without a real runtime, or misleading "AI-generated context" claims. The existing context-builder endpoint performs deterministic ranking and prompt assembly; label it accordingly. AI/LLM API integration is optional future work, not a requirement for this assignment.

### Core user journey

1. Open the dashboard and see actual records and counts from Oracle.
2. Select a project to view its tasks, memories, tags, sessions, and participating agents.
3. Create, view, edit, search, filter, and delete memories; associate relevant task/session and tags.
4. Create or manage tasks, assign an agent, and update task status.
5. Browse agents and inspect their assigned tasks and recorded sessions (not alleged running processes).
6. Build a context bundle for a project from its best-ranked memories, see why items were selected, and copy the generated prompt.
7. Demonstrate meaningful transactions, joins, PL/SQL procedures/functions, cursor processing, triggers, and Oracle connectivity for the course assignment.

---

## 1. Inspect before editing: existing repository is the source of truth

Before coding:

- Read `README.md`, `docs/Report_50_Percent.md`, `backend/main.py`, `backend/requirements.txt`, and every SQL file under `database/`.
- Inspect the actual repository status, branch, current files, available Docker/Oracle setup, Python, Node, npm, and configuration. Preserve unrelated changes. Do not overwrite user modifications.
- Review the current constraints and sample-data relationships before designing forms and endpoints.
- Discover the actual Oracle connection details from existing environment/configuration, **without printing or committing secrets**. If Oracle is unavailable, continue with implementation and clearly distinguish unverified integration work.
- Check the academic guidelines below against the real implementation, not against filenames or comments alone.
- Produce a short internal implementation plan, then **implement it**. Do not stop after planning.

### Files known to exist in the current baseline

```
README.md
backend/main.py
backend/requirements.txt
database/01_schema.sql
database/02_seed.sql
database/03_crud_and_queries.sql
docs/Report_50_Percent.md
docs/schema_output.txt
docs/seed_output.txt
docs/query_outputs.txt
```

The baseline has **eight Oracle tables**: `USERS`, `AGENTS`, `PROJECTS`, `SESSIONS`, `TASKS`, `MEMORIES`, `TAGS`, and `MEMORY_TAGS`.

The baseline contains seed data with at least ten records in each table, 15 SQL queries, a CRUD demonstration, and a FastAPI backend using `python-oracledb` Thin mode. Existing API paths include:

- `GET /api/health`
- `GET /api/projects`
- `GET /api/memories` (filters)
- `POST /api/memories`
- `PUT /api/tasks/{task_id}/status`
- `DELETE /api/memories/{memory_id}`
- `GET /api/context-builder/{project_id}`

**Important:** There is no committed React frontend in the inspected baseline. The schema script currently drops tables before recreating them; **do not rerun that destructive script against a database with user data**. The backend currently has insecure hardcoded fallback credentials; remove them safely.

If the checked-out repository differs from this description, favor what is actually on disk and document deviations.

---

## 2. Non-negotiable course requirements

This is a **Database Systems / Oracle SQL + PL/SQL** assignment, so the database must remain the center of the solution.

| Requirement | Acceptance criterion |
|---|---|
| 6–8 related tables | Preserve the existing eight-table relational design; do not add a ninth table casually. |
| Keys and constraints | Primary keys, foreign keys, `NOT NULL`, `UNIQUE`, `CHECK`, defaults as appropriate. |
| At least 10 meaningful rows per table | Verify counts, preserve/replenish seed data if needed. |
| ER diagram + relational schema | Accurate and updated documentation. |
| At least 15 meaningful SQL queries | Keep/verify existing 15 covering filters, joins, grouping, subqueries, ranking. |
| At least 2 stored procedures | Implement and demonstrate actual business operations. |
| At least 2 PL/SQL functions | Implement and demonstrate meaningful computed values. |
| At least 1 cursor | Show an explicit cursor processing multiple records in a meaningful workflow. |
| At least 2 triggers | Implement and demonstrate useful automatic database behavior. |
| `INSERT`, `UPDATE`, `DELETE` | Execute and demonstrate before/after effects. |
| Database connectivity | Interactive React → FastAPI → Oracle operations. |
| Interactive transaction demonstration | Explain operation → SQL/PLSQL → tables → result. |
| Course report | Include title, problem, requirements, ERD, schema, DDL, query outputs, PL/SQL, demos, conclusion. |

**Make these requirements visible in the finished project and its documentation**, not just fulfilled invisibly. Prefer business operations that can also be invoked by the actual backend.

---

## 3. Technology and engineering constraints

### Required stack

- **Frontend:** React + Vite. Prefer **JavaScript/JSX** for approachability unless the existing project already uses TypeScript. Do not migrate frameworks unnecessarily.
- **Styling:** Tailwind CSS + **shadcn/ui** as an editable component foundation, with deliberate custom styling; `lucide-react` for icons.
- **Backend:** Python + FastAPI, with a small service/repository layer if useful.
- **Database:** Oracle Database in a **locally hosted Docker environment**; SQL*Plus for course SQL/PLSQL demonstrations; `python-oracledb` for API connectivity.
- **Testing:** Frontend test tools appropriate for Vite (e.g., Vitest + React Testing Library); backend pytest or equivalent with API validation and real DB integration checks when accessible.
- **Package management:** npm for frontend; Python virtual environment and `requirements.txt` (or a small established equivalent) for backend.

### Constraints

- Keep modules small, named by responsibility, and beginner-readable. Avoid monolithic components and unnecessary abstraction.
- Do not introduce Redux, Next.js, Prisma, a second database, a vector database, heavyweight UI suites, or an external SaaS dependency without compelling necessity.
- Use backend APIs for data. React must never connect directly to Oracle or embed database credentials.
- Preserve the current ranking concept (`importance * 10 + tag_count * 5`) unless there is a documented, well-tested improvement. This is **heuristic ranking, not semantic/vector search**.
- All SQL values should be parameterized. Never accept arbitrary SQL strings from the frontend.
- All modifications that span multiple tables must be transactional with rollback on failure.
- No hardcoded DB passwords, no checked-in `.env`, no exposing secrets through API responses.
- Make the app usable without an LLM API key.
- Respect any existing project conventions that are already sound.

---

## 4. UI/UX: make it feel designed by a human product team

### Chosen visual direction: **“Editorial Operations Console”**

A calm, precise, professional internal tool inspired by the information density of **Linear**, the observability clarity of **Langfuse**, and the component rigor of **shadcn/ui / Radix**. These are references for principles, **not** permission to clone their proprietary UI/assets.

**Use a polished LIGHT theme as the primary theme**, rather than the generic AI-startup dark-purple aesthetic. A cohesive dark mode is a stretch goal only after light mode is complete and accessible.

Suggested design tokens (adjust slightly to meet accessibility contrast, but stay coherent):

| Token | Value / direction |
|---|---|
| App background | Warm off-white `#F6F7F4` |
| Main surface | `#FFFFFF` |
| Raised/secondary surface | `#F0F3EF` |
| Primary text | Deep ink `#1D2523` |
| Secondary text | Muted gray-green `#65716C` |
| Border | Quiet `#E0E6E1` |
| Brand/action accent | Deep teal `#176B5B` |
| Accent hover | `#125546` |
| Success | Muted green, never neon |
| Warning | Ochre/amber |
| Danger | Muted red |
| Typeface | Inter or clean system sans; IBM Plex Mono / system mono for IDs and technical context |
| Radius | 8–10px controls, 10–12px panels; avoid excessively rounded cards |
| Shadow | Almost none; thin borders and spacing establish hierarchy |

### Explicit anti-template rules

- No purple/blue gradient hero sections, glowing robot graphics, glassmorphism, floating blobs, giant generic KPI cards, fake activity sparklines, lorem ipsum, emoji icons, excessive shadows, or indiscriminate animations.
- Do not use the same card design for every type of content: choose **tables for dense data**, **cards for summaries**, **drawers/detail panels for editing**, **tabs for secondary details**.
- Avoid an empty dashboard full of four meaningless statistics. Show useful project activity and next actions drawn from real data.
- Prefer compact, aligned information and strong type hierarchy over oversize text.
- Use a restrained 8px-based spacing system and consistent button/input heights.
- Use subtle status pills that are distinguishable without color alone.
- Include useful empty/loading/error states, skeletons where appropriate, clear confirmation for destructive actions, and transient success/error notices.
- Use consistent human-written microcopy: e.g., **“New memory”**, **“Add task”**, **“Build context”**, **“No memories match these filters”**.
- Accessibility: semantic markup, keyboard navigation, visible focus states, input labels, aria text for icon-only buttons, modal focus management, suitable color contrast, reduced-motion preference.
- Responsive: desktop-first, but usable at tablet/mobile widths with a collapsible sidebar and non-overflowing forms/tables.

### Suggested layout

**Desktop shell:**

```
┌────────────────┬──────────────────────────────────────────────────────────┐
│ ContextDB      │  Breadcrumb / current project       Search   User/Info   │
│ ────────────── │──────────────────────────────────────────────────────────│
│ Overview       │  Page title                         Primary action      │
│ Projects       │  Short purpose / filters / tabs                          │
│ Memories       │                                                          │
│ Tasks          │  Data table, detail view, or memory context workspace     │
│ Agents         │                                                          │
│ Sessions       │                                                          │
│ Context Builder│                                                          │
│                │                                                          │
│ Oracle status  │                                                          │
└────────────────┴──────────────────────────────────────────────────────────┘
```

- Sidebar roughly 220–248px; content comfortably max-width constrained on large displays.
- Project selection should be persistent in app state and encoded in routes or URL query parameters where useful.
- Deep links must work after refresh.
- Use proper tables with sorting, search, filter chips, meaningful column labels, dates, and accessible row actions.
- Details may open in a right-hand drawer or dedicated page. Prefer one consistent pattern.

### Pages and interactions

**A. Overview**
- Counts from actual DB: projects, active projects, open tasks, stored memories, and recent sessions (as records).
- A small list of recent memories or prioritized open tasks and a project selector.
- A clear CTA to create memory or build context.
- If Oracle is disconnected, show an actionable connection banner, not fabricated metrics.

**B. Projects**
- Searchable list/table with name, status, task count, memory count.
- Project details with overview, tasks, memories, relevant sessions/agents.
- Create/edit project if supported in scope; protect destructive delete with confirmation and describe cascading effects.

**C. Memories (primary workflow)**
- List/table showing title, type, project, importance, tags, modified date.
- Search by keyword; filter by project/type/importance/tag; sort by relevance/recency as appropriate.
- Create/view/edit/delete memory with a readable, spacious editor for CLOB text.
- Show references to associated task/session, and clear **project-wide versus agent-associated** context semantics.
- Tags can be selected and updated. Display success, validation, conflict, and error feedback.
- When delete is possible, warn about effects on `MEMORY_TAGS` records.

**D. Tasks**
- List by project, priority, status, assignee.
- Create/update/delete, assign or unassign an agent, update status and completion timestamp correctly.
- Link relevant memories. Display task details and agent assignment without implying live task execution.

**E. Agents**
- List all records (`agent_name`, `model_name`, `model_version`).
- Detail view: assigned tasks, historical sessions, and related knowledge accessible through existing task/session/project relationships.
- Do **not** show an agent as “Running” simply because an `AGENTS` row exists. An `ACTIVE` session is a stored session status, not proof of a live agent process.
- Do not add Start/Stop/Restart controls unless there is a real, tested runtime. Agent metadata CRUD may be offered if straightforward.

**F. Sessions**
- Readable session history with user, agent, project, start/end, stored status.
- Search/filter or project drill-down. Creation/closure only if domain-consistent.

**G. Context Builder (signature feature)**
- Select project and optionally meaningful filters.
- Call the existing context-builder service (extend carefully as needed).
- Display the top-ranked memories with type, importance, tag count, and numerical relevance score.
- Explain that scores use a rule-based ranking formula.
- Show a nicely formatted, selectable/copyable final prompt in a dedicated panel.
- Provide **Copy context**, copy feedback, and empty-state guidance.
- Never display a fictional AI response unless an actual LLM integration is configured and explicitly used.

### UI inspiration and component references

- Linear: https://linear.app/ — compact information architecture, navigation, item detail UX.
- Langfuse: https://langfuse.com/ — traces/sessions concepts and technical data presentation.
- shadcn/ui: https://ui.shadcn.com/ — editable React primitives. Vite setup: https://ui.shadcn.com/docs/installation/vite
- Radix Themes: https://www.radix-ui.com/themes/docs/components — accessibility and consistency principles.
- Lucide: https://lucide.dev/guide/react/ — coherent icon family.

**Implementation policy:** Use references for hierarchy, density, affordances, and visual restraint. Build a unique ContextDB design with the token palette above. Do not simply install a generic admin template and change the logo.

---

## 5. Database evolution — preserve the eight existing tables

Inspect `database/01_schema.sql` before changing anything. The existing relational model is useful and should remain recognizable.

### Critical data model rules

- `MEMORIES` are primarily **project-level knowledge**. A memory may optionally reference a `TASK` or `SESSION`. Show agent-related context by joining through the relationships that actually exist.
- Do **not** silently redefine `MEMORIES` as owned by individual agents. If optional direct agent association is genuinely needed, consider a **nullable FK column in the existing `MEMORIES` table** (with a safe forward migration), rather than creating a ninth table. Document the meaning of shared/project/agent associations. Prefer no schema change if joins satisfy the UX.
- Check that linked task/session and memory all belong to the same project. Apply server-side validation; use relational constraints where reasonable. Reject inconsistent cross-project associations.
- The script that drops tables is for a clean test environment only. Never run it on an existing persistent database without explicit backup/approval.
- Seed script must be reproducible **on a clean schema**; protect against accidental duplicate seeding or explain clean-only behavior.
- Existing seed records and all course SQL query examples should remain usable.
- Preserve meaningful `ON DELETE` behavior, but surface cascading effects clearly in the UI.
- Track creation/update timestamps accurately in Oracle; handle date serialization and timezone display consistently.

### Required new SQL/PLSQL work

Create organized, executable SQL*Plus-compatible scripts, for example:

```
database/04_plsql_programs.sql
database/05_plsql_demo.sql
database/06_verification.sql
```

Implement **at least** these meaningful database components (names can be adapted to existing conventions):

1. **Procedure `sp_assign_task`**: receives task ID and nullable agent ID; validates task/agent existence, updates assignment atomically, emits meaningful errors for invalid input. Backend task-assignment endpoint calls this procedure.
2. **Procedure `sp_update_task_status`**: receives task ID and allowed new status, validates domain rules, updates task status. A trigger handles `completed_at` consistently. Backend status endpoint calls this procedure.
3. **Function `fn_memory_relevance`**: returns score for a given memory using the documented importance/tag heuristic (or an equivalent well-documented computation). Demonstrate from SQL.
4. **Function `fn_project_open_task_count`**: returns count of non-completed tasks in a project (define whether `BLOCKED` is included; document consistently). Demonstrate in a SELECT and/or API summary.
5. **Explicit cursor**: e.g., in a third procedure `sp_project_task_report`, iterate a project's tasks to produce a clear SQL*Plus summary using `DBMS_OUTPUT`, recording/aggregating task information. It must actually process multiple rows in a `CURSOR ... OPEN/FETCH/CLOSE` or declared-cursor loop, not merely declare an unused cursor.
6. **Trigger `trg_memories_updated_at`**: automatically updates `updated_at` when a memory row changes.
7. **Trigger `trg_tasks_completion_stamp`**: sets `completed_at` when status becomes `COMPLETED`, clears it when reopened, and handles initial insert rules consistently.

Follow Oracle rules for triggers, exceptions, transactions, and SQL*Plus `/` terminators. Do not put unsafe `COMMIT` statements inside ordinary triggers. Keep procedures/functions **demonstrably useful**, with expected results and controlled negative-case demonstrations. You may improve the above choices if justified, but do not leave the explicit course counts unmet.

**Demo script:** Run `SET SERVEROUTPUT ON`; invoke procedures/functions and cursor; show before/after state for triggers; ensure repeatable cleanup or rollback for demonstration-only data. Preserve evidence of actual outputs in docs, without fabricating screenshots/logs.

**The 15 existing SQL queries:** Audit execution and results, keep their breadth, fix if broken, and make their output reproducible. Don't replace meaningful joins with trivial SELECTs merely to meet the count.

---

## 6. Backend: turn the existing FastAPI into a maintainable API

Preserve stable endpoints unless a clearly documented migration is needed. The current `backend/main.py` may be split into a modest structure, such as:

```
backend/
  main.py
  config.py
  db.py
  schemas/
  routers/
    health.py
    projects.py
    memories.py
    tasks.py
    agents.py
    sessions.py
    context.py
  services/
  tests/
  requirements.txt
  .env.example
```

Do not create needless abstraction layers; a smaller structure is fine if readable.

### Required API behavior

- Health endpoint: check actual DB connectivity, distinguish healthy from disconnected; avoid exposing password/credential internals and unnecessary connection details.
- Projects: list/detail; create/update/delete if supported; counts must not inflate due to joining two 1-to-many relations (use independent subqueries or correct distinct aggregates).
- Memories: full CRUD, list with pagination/limit safeguards, filtering, tag associations, and detail retrieval. Validate importance 1–5, allowed type, project/task/session association and CLOB content. `PUT` or `PATCH /api/memories/{memory_id}` is essential.
- Tasks: list/detail, create/update/delete, assign/unassign agent, update status. Completion timestamps must be correct after reopen.
- Agents: list/detail, assigned tasks and session history; metadata updates if in scope.
- Sessions: at minimum real read/list/filter/details against stored records.
- Tags: list, use in memory forms, manage tag associations transactionally; optional tag CRUD if sensible.
- Context Builder: deterministic relevant memory retrieval; clear response schema with component memories, scores, and assembled prompt. Return helpful responses if a project exists but has no memories versus if project does not exist.
- Use proper HTTP status codes: 201 on create, 404 for missing entities, 400/422 for validation and relational issues, controlled 409 conflicts, 503 when DB unavailable.
- Use an explicit, documented CORS allowlist for local Vite dev origins. No unrestricted wildcard with credentials.
- Use parameter binding everywhere, including keyword filters and IDs.
- Handle Oracle `CLOB` → JSON strings and timestamp serialization safely.
- Use database transaction boundaries and rollback on any failure (e.g., memory created but tag association invalid).
- Do not return raw Oracle stack traces to browser clients; log useful server-side diagnostics.
- Model mutable Pydantic list defaults with `Field(default_factory=list)` rather than shared literal defaults.
- Use environment variables for DB credentials (`ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_DSN`); fail clearly when missing. Remove hardcoded username/password fallback from tracked code.

### API shape examples (adapt if compatibility requires)

```
GET    /api/projects
GET    /api/projects/{project_id}
POST   /api/projects
PATCH  /api/projects/{project_id}

GET    /api/agents
GET    /api/agents/{agent_id}
GET    /api/agents/{agent_id}/tasks
GET    /api/agents/{agent_id}/sessions

GET    /api/tasks?project_id=&status=&agent_id=
POST   /api/tasks
PATCH  /api/tasks/{task_id}
PUT    /api/tasks/{task_id}/status
PUT    /api/tasks/{task_id}/assignment
DELETE /api/tasks/{task_id}

GET    /api/memories?project_id=&memory_type=&keyword=&min_importance=
GET    /api/memories/{memory_id}
POST   /api/memories
PATCH  /api/memories/{memory_id}
DELETE /api/memories/{memory_id}
GET    /api/tags
GET    /api/sessions
GET    /api/context-builder/{project_id}
```

A reasonable smaller API is fine if every **promised** UI control has a real working endpoint and all course transactions are demonstrated. Explicitly avoid decorative buttons that do nothing.

---

## 7. Frontend code organization

Create `frontend/` without rewriting existing backend/database work. Suggested structure:

```
frontend/
  index.html
  package.json
  vite.config.js
  .env.example
  src/
    main.jsx
    App.jsx
    styles/globals.css
    components/
      layout/      # AppShell, Sidebar, Header, PageHeading
      ui/          # shadcn-generated/editable primitives
      common/      # StatusBadge, EmptyState, ConfirmDialog, DataTable
      memories/    # MemoryForm, MemoryList, MemoryDetail
      tasks/       # TaskForm, TaskTable, TaskDetails
      context/     # ContextResult, RankedMemoryList
    pages/
      OverviewPage.jsx
      ProjectsPage.jsx
      ProjectDetailPage.jsx
      MemoriesPage.jsx
      TasksPage.jsx
      AgentsPage.jsx
      AgentDetailPage.jsx
      SessionsPage.jsx
      ContextBuilderPage.jsx
    services/
      apiClient.js
      projectsApi.js
      memoriesApi.js
      tasksApi.js
      agentsApi.js
      contextApi.js
    hooks/
    lib/
      formatters.js
      constants.js
    tests/
```

Principles:

- Keep API fetch/HTTP logic inside `services/`, not scattered through JSX.
- Keep state close to where it is used; simple hooks/context are enough. Add a data-fetching library only if it materially simplifies cache invalidation and state.
- Keep route names and navigation predictable; use React Router if needed.
- Use `VITE_API_BASE_URL` (public backend URL only, **not** DB secrets) and appropriate local dev proxy/CORS configuration.
- Use forms that map to real API fields and validation. Account for CLOB size and user-friendly editing.
- Every mutation should refresh/invalidate affected lists and detail views, and reflect backend responses rather than assuming success.
- Show loading/error/success states; avoid unhandled promise failures.
- Seeded data may populate the actual local database but must **not** be hardcoded in frontend as if fetched from Oracle.
- Avoid hardcoded fake statuses, fake timestamps, placeholder chart metrics, and fabricated activity.

---

## 8. Oracle Docker and local run experience

Support the actual locally hosted Docker Oracle database setup, **without destroying an existing database volume**.

- Inspect whether an Oracle Docker container already exists and its service/PDB/port first.
- If no reproducible Docker config exists, provide a minimal `docker-compose.yml` or `compose.yaml` and `.env.example` using an appropriate, documented Oracle Database Free image/version compatible with the environment. Verify image naming and license/setup instructions before choosing. Use a named persistent volume and a sensible health check if supported.
- Do not hardcode a personal DB username/password into compose, Python, or documentation. Document creation of an application schema/user with appropriate scoped permissions.
- Explain that SQL*Plus is a **client** for Oracle Database, not the database itself.
- Include copyable commands for starting Oracle, connecting with SQL*Plus, creating/upgrading schema safely, loading seed data (clean environment only), installing backend requirements, starting FastAPI, installing frontend dependencies, and starting Vite.
- Provide `.env.example` for backend and frontend, and update `.gitignore` to exclude `.env`, virtual environments, node modules, frontend build outputs, pytest caches, etc.
- Add simple start commands or scripts where they help. Do not demand orchestration frameworks.
- Support demo startup on `localhost`, with database port and DNS appropriately mapped for host versus container execution.

---

## 9. Tests, verification, and honesty

### Minimum verification expected

**Database**
- Check exactly eight tables and at least ten rows per table in a clean seeded instance.
- Verify declared PK/FK/UNIQUE/CHECK constraints.
- Execute 15 queries and show evidence.
- Demonstrate 2+ procedures, 2+ functions, an explicit cursor, and 2+ triggers.
- Prove CRUD before/after, cascade behavior, status timestamp behavior, and rollback when a tag ID is invalid.
- Ensure scripts run with SQL*Plus semantics, not just generic SQL syntax.

**Backend**
- FastAPI app imports and starts.
- Health endpoint reports actual DB availability correctly.
- Happy-path and failure-path tests for memory CRUD, tag updates, task assignment/status, not-found IDs, invalid foreign keys, context ranking, and project aggregates.
- Test SQL injection attempts in filters (parameterized queries), project association validation, and safe error responses.
- Test the CLOB result conversion path.
- Validate stored procedure integration if Oracle is available.

**Frontend**
- `npm run build` passes.
- No dead navigation links or action buttons.
- Test the main user flows, including creating/editing/deleting memory, task status update, loading agent detail, building/copying context, and empty/error states.
- Review at desktop and mobile widths (e.g., 1440px, 768px, 390px), keyboard navigation, contrast, and overflow.
- No fake data displays masquerading as database results.

**Integrated flow**
- Use the actual Oracle-backed API to create a memory, see it in the UI, edit it, build context reflecting the update, and delete it.
- Use the actual API to assign a task and change its status, and show relevant PL/SQL components executed.
- If browser automation isn't available, at minimum execute meaningful HTTP smoke tests and describe UI verification limits precisely.

If a runtime dependency is unavailable, **do not invent test success**. Implement as much as possible, list exact checks performed, and provide commands that can be run later.

---

## 10. Documentation deliverables

Create/update:

1. **`README.md`** — what ContextDB is, features, stack, folder map, prerequisites, exact startup steps, URLs, environment configuration, troubleshooting, and demo walkthrough.
2. **`docs/ARCHITECTURE.md`** — system diagram: React → FastAPI → Oracle; data flow; where to edit a frontend view, API endpoint, database procedure; memory ranking semantics; distinction between project-memory and running agents.
3. **`docs/DATABASE.md`** — eight-table ER diagram, relational schema, PK/FK/constraints, relation semantics, SQL script execution order, PL/SQL component descriptions, seed/data safety notes.
4. **`docs/API.md`** (or OpenAPI + a concise explanation) — endpoints, example request/response, errors.
5. **`docs/DEMO_WALKTHROUGH.md`** — precise academic viva/demo narrative linking each user operation to endpoint, SQL/PLSQL, affected tables, and result.
6. **Final course report** updating `docs/Report_50_Percent.md` or creating `docs/Final_Report.md` with the required sections and *actual* evidence. Don't replace the existing intermediate report unless sensible.
7. **`docs/CHANGE_MAP.md`** — maintenance guide for me as an AI-assisted developer: "to change X, edit files A/B/C"; explain conventions, major components, routes, API services, and database SQL files.

Do not fabricate screenshots, query outputs, timestamps, benchmark figures, or test results. Generate output captures only from actual executions. If a screenshot/report artifact needs a browser/PDF tool not available, leave a clear documented step rather than faking it.

---

## 11. Recommended implementation sequence (execute now, not just propose)

1. **Audit:** check git status, code, schema, seed data, Docker/Oracle env, and gaps. Protect local state.
2. **Database:** add migration-safe PL/SQL scripts, validate existing queries/schema/seed, implement meaningful procedures/functions/cursor/triggers and demo outputs. Avoid destructive reset of populated DB.
3. **Backend:** secure config, refactor modestly, implement missing working APIs, call PL/SQL where appropriate, add validations/tests.
4. **Frontend foundation:** set up Vite React, Tailwind, shadcn/ui, fonts/icons, routes, layout shell, navigation, tokens.
5. **Core UI:** Projects, Memories CRUD, Tasks, Agents, Sessions, Context Builder, Overview — in that order or another pragmatic dependency order.
6. **Integration:** connect all data and mutations to FastAPI/Oracle; make context-builder the standout workflow.
7. **Polish:** responsive layouts, actionable errors/empty states, accessible interaction, deliberate visual consistency, no generic AI aesthetic.
8. **Verification:** execute DB scripts, API tests, frontend build/tests and end-to-end smoke flows where possible; fix failing tests.
9. **Documentation:** update readmes/report, diagrams, API examples, demo walkthrough, and change map.
10. **Final output:** summarize exactly what was changed, commands run and results, what was not verified, current limitations, and the smallest remaining actions for me.

### Prioritization if resources/time are constrained

**P0 (must work):** preserve schema and data, 2 procedures/2 functions/cursor/2 triggers; frontend shell; project list; memory full CRUD; task listing/status/assignment; project context builder; real API integration; basic tests; run instructions.

**P1:** project/task full CRUD, agent/session drilldowns, tag management, richer filters, polished validation and demo documentation.

**P2:** optional dark mode, keyboard shortcuts, advanced tables and visualizations. Never sacrifice P0 for optional visual effects.

---

## 12. Definition of done

Do not declare the project complete merely because the frontend renders or the SQL files exist.

It is done when:

- [ ] The existing eight-table Oracle model is preserved and documented.
- [ ] Seed data and 15 meaningful queries are verified on a usable database, or environment limitations are disclosed.
- [ ] Two procedures, two functions, one cursor, and two triggers exist, are meaningful, and have executable demonstrations.
- [ ] FastAPI securely connects to Oracle through environment configuration.
- [ ] React + Vite shows real projects, memories, tasks, agents, sessions, and context-building results.
- [ ] At least the memory creation/editing/deletion, task status/assignment, and context-building workflows work end-to-end.
- [ ] UI follows the **Editorial Operations Console** design: light, neutral, high-quality, compact, accessible, no generic AI-generated visual patterns.
- [ ] Forms, actions, route refreshes, loading states, errors, and destructive confirmations work.
- [ ] Frontend build and available backend/database checks have been run; failures are fixed or explicitly reported.
- [ ] Documentation makes the project understandable for an owner who uses AI to help code but wants to know **what, where, and how** to change features later.
- [ ] No uncommitted secret files are tracked, and existing unrelated work is preserved.

## Final Codex response format

When implementation is finished, answer with:

1. **What you implemented** — brief feature-by-feature summary.
2. **Important files changed** — paths and purposes.
3. **How to run it** — commands for DB, backend, frontend.
4. **Assignment compliance** — checklist of all course requirements.
5. **Verification evidence** — exact commands/tests executed, actual results, and limitations.
6. **How to modify it later** — pointers to `docs/CHANGE_MAP.md`.
7. **Remaining gaps** — be candid; no fabricated completeness.

**Start by inspecting the checked-out project and available environment; then implement the complete working solution.**
