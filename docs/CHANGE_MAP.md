# Change map / maintenance guide

## Where to change a feature

- **Navigation, project selector, notices, connection banner:** `frontend/src/components/layout/AppShell.jsx`. Routes live in `frontend/src/App.jsx`. Keep project selection in the URL; use refresh after successful writes.
- **Colors, spacing, responsiveness, table/form styles:** `frontend/src/styles/globals.css`. Tokens are warm off-white, ink, gray-green and deep teal. Breakpoints include 1100/800/480px. Tables scroll inside their panels.
- **Accessible buttons/dialogs:** `frontend/src/components/ui/button.jsx` and `dialog.jsx`. These are editable shadcn/ui-derived primitives using Radix. Keep Radix focus handling and accessible dialog title/description. `components.json` and the `@` alias support future shadcn components.
- **Tab keyboard behavior:** `components/common/Tabs.jsx`; ArrowLeft/Right, Home/End, selected tab and labelled panel relationships are centralized.
- **Memory form:** `components/MemoryEditor.jsx`; list/detail controls in `pages/MemoriesPage.jsx`; shared table in `components/common/RecordTables.jsx`.
- **Task form/status/assignee:** `components/TaskEditor.jsx` and `pages/TasksPage.jsx`. Save uses PATCH; backend calls both procedures where needed. Preserve nullable unassignment and trigger-owned completion timestamps.
- **Projects:** `pages/ProjectsPage.jsx`. The detail tabs link to real project/task/memory/session/agent records. Project deletion is cascading and must remain clearly confirmed.
- **Agents and sessions:** `pages/AgentsPage.jsx`, `pages/SessionsPage.jsx`. Read-only metadata/history. Never infer a live process from stored ACTIVE status.
- **Context layout, filters and copy:** `pages/ContextBuilderPage.jsx`. Prompt text comes from the API; do not create fictional responses in React.
- **HTTP requests/errors:** `services/apiClient.js`. Query construction omits blank values. Set `VITE_API_BASE_URL` only for a public API origin. `hooks/useResource.js` handles reads and aborts; workspace refresh version invalidates reads after mutations.
- **Allowed types/statuses and dates:** frontend `lib/constants.js`; backend `models.py`; Oracle CHECKs in `01_schema.sql`. A new allowed type requires all three to agree and an explicit forward constraint migration for existing databases.
- **API endpoint:** `backend/main.py`. Validate requests with `models.py`, keep SQL in `repository.py` where shared, and enter `db.connection()` for transaction handling. Returning from inside the context commits only after the handler succeeds.
- **Connection config/CORS:** `backend/config.py`, `backend/.env.example`. Local secrets belong in ignored `backend/.env`, never source. CORS alone is not authentication.
- **SQL bind and CLOB behavior:** `backend/db.py`. Identifiers are trusted internal constants; bind all user values. Never move `.read()` calls outside the connection lifetime. Preserve knowledge whitespace.
- **Memory association/tag logic:** `backend/repository.py`. Check task/session project IDs against the memory's immutable project. A bad tag must fail the entire transaction, including deleted old mappings on an edit.
- **Ranking:** `fn_memory_relevance` in `04_plsql_programs.sql`, context endpoint prompt assembly, frontend formula labels, tests and docs. Current score is importance × 10 + number of tags × 5, ties by memory ID.
- **Task business rules:** procedures/triggers in `04_plsql_programs.sql`. Keep transactions under caller control; no commits inside procedures/triggers. Reinstall with the safe SQL runner, then test completion and reopening.
- **Tables:** `01_schema.sql` is clean-install DDL. Do not edit it and rerun against existing data expecting an upgrade. Add a new numbered forward migration that preserves data and stays within the assignment's eight-table limit.
- **Seed and course queries:** `02_seed.sql` is clean-only; `03_crud_and_queries.sql` contains rollback demo and Q1–Q15. `05` demonstrates PL/SQL and `06` verifies the application schema.
- **Docker:** `compose.yaml` is for a new isolated instance. Existing `oracle-db` stays on its existing volume. Do not replace or remove volumes when making application changes.

## Checks by change type

Backend validation/SQL changes: run `RUN_ORACLE_TESTS=1 .venv/bin/python -m pytest backend/tests -q`. PL/SQL changes: install `04`, execute `05`/`06`, run Oracle tests, and consider `scripts.verify_clean`. UI changes: `npm test`, `npm run build`; with the API running, `RUN_LIVE_TESTS=1 npm test` exercises React through HTTP and Oracle in jsdom. Perform real browser visual/keyboard checks separately; jsdom does not measure layout or confirm system clipboard permissions.

Use `npx prettier --write src` inside frontend to keep JSX readable. Python files were formatted with Ruff; formatter is optional and not a runtime dependency. Prefer small responsibility-based components over adding a state-management framework.

## Adding a feature safely

Define the real operation first, add its request model and transactional API implementation, expose it in a form with labels/loading/error feedback, refresh after successful mutation, then test meaningful success and failure paths. If Oracle is disconnected, show an error rather than substitute example records. Update the API/demo docs when the behavior changes.
