# Verification record

Verification was performed on 18 October 2026. This file describes actual runs, not a proposed test plan. Logs in `evidence/` retain process-reported clocks, which may be UTC; user-facing dates use Asia/Kolkata.

## Environment and preservation

Existing branch: `main`. Initial untracked user file: `CONTEXTDB_CODEX_IMPLEMENTATION_PROMPT.md`, preserved. No pre-existing tracked edits were present. Existing `oracle-db` container (`gvenzl/oracle-free:latest`, Oracle reports **23.26.2.0.0**) was restarted with its original named `oracle-data` volume. No application tables were dropped or reseeded. Other coursework tables in the shared schema were left untouched. The original intermediate report and original output captures were retained.

Runtime versions observed: Python 3.14.7, Node 26.10.0, npm 12.2.0, FastAPI 0.143.1, python-oracledb 3.4.2, pytest 9.1.1, React 19.3.1, Vite 7.3.7, Vitest 5.0.5. The frontend lockfile captures installed JS dependencies.

## Commands and actual outcomes

- `RUN_ORACLE_TESTS=1 .venv/bin/python -m pytest backend/tests -q`: **29 passed**. Includes real Oracle memory create/read/update/delete, Unicode CLOB >100 KB, duplicate-tag deduplication, invalid-tag rollback on create and edit, task procedure assignment/unassignment, completion/reopen, invalid foreign keys, missing IDs, immutable project association, aggregates, deterministic score ordering, keyword injection literal handling, pagination, cascades and duplicate project conflicts. Unit tests cover validation, independent default lists, CLOB conversion, sanitized errors, absent configuration, rollback context and CORS. One Starlette warning notes future TestClient migration from httpx to httpx2; no test failed. [Backend log](evidence/backend_tests.txt).
- `RUN_LIVE_TESTS=1 npm test` in frontend: **10 passed across two files**. Eight mocked HTTP UI tests exercise create/edit/delete memory, confirmation, task status/assignment, agent history, deterministic context/copy, empty/error states and Escape/focus restoration. Two tests render React in jsdom and call the **running real HTTP API and Oracle** for memory lifecycle/context and task procedure execution. Temporary projects are deleted in cleanup. Clipboard is mocked in tests. [Frontend log](evidence/frontend_tests.txt).
- `npm run build`: **passed**, Vite production assets generated. [Build log](evidence/frontend_build.txt).
- `npm audit`: **0 vulnerabilities** after upgrading the test runner dependencies. [Audit log](evidence/npm_audit.txt).
- `.venv/bin/python -m scripts.http_smoke`: **passed** over real localhost HTTP. Project/task/memory create, assignment, complete/reopen, edit, context and delete; before/after counts for all eight tables matched. [HTTP evidence](evidence/http_smoke.txt).
- `.venv/bin/python -m scripts.run_sql database/04_plsql_programs.sql`: **passed**, three procedures, two functions, two triggers VALID. [Installation output](evidence/plsql_install.txt).
- `.venv/bin/python -m scripts.run_sql database/03_crud_and_queries.sql`: **passed**, CRUD before/after, rollback and all Q1–Q15 executed. [New query capture](evidence/query_outputs.txt).
- `.venv/bin/python -m scripts.run_sql database/05_plsql_demo.sql`: **passed**, two cursor rows, status timestamps, updated_at, assignment/unassignment, functions, expected invalid-agent/status failures, invalid-tag rollback and cascade 1 → 0. Final temporary project count 0. [PL/SQL evidence](evidence/plsql_demo.txt).
- `.venv/bin/python -m scripts.run_sql database/06_verification.sql`: **passed**, all app tables ≥10 rows, application constraints enabled, seven valid programs, no mismatched project associations. [Shared-schema verification](evidence/database_verification.txt).
- `.venv/bin/python -m scripts.verify_clean`: **passed**. Created an isolated random schema, ran 01/02/04/03/05/06 with SQL*Plus, asserted exactly eight total tables, verified seeds, then removed only the temporary schema. [Full clean-install log](evidence/clean_schema_verification.txt).
- Repeated 01/02 in the isolated populated schema: **correctly refused** with ORA-20010. These errors are intentional guard assertions, not failed installation. [Guard evidence](evidence/initialization_guards.txt).
- Static palette checks: primary/secondary/sidebar/button and success/warning/danger text pairs all exceed **4.5:1** (4.73:1 minimum among checked pairs). This is not a complete computed-style/browser accessibility audit. [Color calculations](evidence/color_contrast.txt).
- `python -m compileall -q backend scripts`, `ruff check --select F backend scripts`, `git diff --check`: **passed**.
- `docker compose config --quiet` with disposable configuration-check values: **passed**. No new image was downloaded or new Compose database booted.
- HTTP GET of Vite `/`, `/memories/1` and proxied `/api/health`: **200**. This verifies server routing/proxying, not visual browser rendering. [Tool/HTTP checks](evidence/tool_checks.txt).

Final existing-data counts: USERS 10, AGENTS 10, PROJECTS 10, SESSIONS 12, TASKS 13, MEMORIES 16, TAGS 10, MEMORY_TAGS 21. The original historical CRUD memory/mapping accounts for the extra memory and mapping relative to the clean seed (15/20); these were preserved. See [machine-readable counts](evidence/final_counts.json).

## What was fixed during verification

- CLOB request text originally inherited global trimming; it now preserves indentation and final newlines while rejecting all-whitespace input.
- Shared-schema verification initially counted unrelated coursework tables; it now targets the eight ContextDB names and separately asserts eight total tables during clean verification.
- UI tests had an ambiguous duplicate project-option selector and a text-value matcher that did not accept asymmetric matchers; selectors/assertions were corrected and the suites rerun successfully.
- npm audit initially identified test-runner transitive vulnerabilities; Vitest was updated and audit is now clean.
- Explicit dialog return-focus handling and keyboard tab navigation were added alongside Radix focus trapping.

## Verification limits / remaining manual checks

The computer-use tool returned **no available browsers or native apps**. Therefore no real browser screenshots, visual inspection, or system clipboard-permission tests were completed. React DOM integration tests verify data flow, not layout. Do not interpret the live jsdom tests as visual end-to-end browser coverage.

Manual release review is still required at **1440px, 768px and 390px**: sidebar collapse, table panel scrolling, form/drawer bounds, long titles/content, visible focus, Tab/Shift-Tab, Escape, arrow-key tabs, screen-reader announcements, contrast and clipboard behavior. Core palette contrast was calculated separately as noted above. CSS includes responsive breakpoints, focus states and reduced-motion handling, but those visual/accessibility results are not claimed as measured.

The optional new Compose image path was configuration-validated only. The running existing Oracle instance and isolated schemas on it were fully exercised. There is no authentication, no user/agent/session/tag-definition CRUD, no model execution or vector search, and no token budgeting. Those are intentional scope boundaries; core memory/project/task CRUD and history/context workflows are implemented. Related-record selectors/detail sections have documented caps for a course-sized dataset.
