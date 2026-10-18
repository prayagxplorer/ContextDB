# Academic demo / viva walkthrough

Start Oracle, FastAPI and Vite using README. Open http://localhost:5173 and http://localhost:8000/docs. Use a temporary project for the interactive demo so historical seed/coursework data stays unchanged.

## 1. Explain the problem and relational model

“ContextDB keeps requirements, decisions and findings available after a chat ends. It stores project knowledge, not running agents.” Show the eight-table ERD in DATABASE.md and the SQL DDL. Explain PKs, FKs, UNIQUE names/emails, domain CHECKs, NOT NULL fields, identity defaults, and the composite mapping key. Demonstrate the distinction between project-wide knowledge and task/session-associated knowledge.

## 2. Show connectivity and accurate counts

Open Overview. `GET /api/overview` reads Oracle project summaries and recent rows. Each project count uses an independent aggregate, avoiding task × memory fan-out. `fn_project_open_task_count` includes BLOCKED work. Health checks execute actual COUNT queries rather than optimizer estimates. Show `/api/health`; no credentials appear.

## 3. Create a project and task

Projects → New project. Save “Viva demo” with a description. The API inserts PROJECTS and returns its generated ID. Open the project and use the global selector to scope the workspace. Tasks → Add task; give it a title/description, HIGH priority and an agent.

`POST /api/tasks` inserts TASKS, calls `sp_assign_task` and `sp_update_task_status` in one transaction. The FK references AGENTS; assignment does not start a process.

## 4. Create, search and edit project knowledge

Memories → New memory. Select the demo project, type RULE, importance 5, a tag, and the demo task. Keep source session unset because historical sessions in another project cannot be linked. Save text with a reason, not just a headline.

`POST /api/memories` validates ownership, inserts MEMORIES with a CLOB and `RETURNING`, then inserts MEMORY_TAGS. Show the new memory in the table, search its title/content, filter type/tag/importance, and open details. Edit the content/tags and save. `PATCH` updates rows transactionally; `trg_memories_updated_at` stamps the edit. A tag-only edit also touches the memory row.

Demonstrate rejected cross-project association through Swagger using a session/task from another project: 422, no partial insert. Submit a clearly nonexistent positive tag ID, such as 999999999, and confirm that the memory list/count did not grow. Do this only with new demonstration content. API tests and PL/SQL demo provide reproducible rollback evidence.

## 5. Assignment and completion triggers

Open the task, Edit task, set COMPLETED. API calls `sp_update_task_status`; `trg_tasks_completion_stamp` records completion. Reopen to OPEN/BLOCKED and verify completion time becomes blank. Clear assignee to demonstrate `sp_assign_task(task_id,NULL)`. Edit preserves the same task identity and project.

The UI submits a task PATCH when editing several fields; the dedicated PUT status/assignment routes remain available in Swagger and the HTTP smoke test. Both paths invoke the same Oracle procedures.

## 6. Build and copy context

Context Builder → demo project → Build context. Explain the score: importance 5 gives 50, one tag adds 5, so total 55. Show contributing values, stable ordering, the edited text in the assembled prompt, and Copy context feedback. No model was called. An empty selection is explained rather than reported as a missing project.

## 7. Browse related records

Agents → selected agent → Tasks/Sessions/Knowledge. Agent knowledge is joined through TASKS/SESSIONS. Session “Active” is a recorded status. Project tabs show related agents/tasks/memories/sessions. Show the session detail user, agent and timestamps. Do not describe records as live execution.

## 8. Demonstrate DELETE and cascades

Delete the demo memory after reading its confirmation: its MEMORY_TAGS rows disappear, TAGS remain. Delete the task: linked memories, if any, remain and `task_id` becomes NULL. Delete the temporary demo project at the end; its confirmation lists dependent data. Never delete the seeded projects merely to demonstrate a cascade.

## 9. SQL*Plus evidence

From the repository root:

```bash
.venv/bin/python -m scripts.run_sql database/03_crud_and_queries.sql
.venv/bin/python -m scripts.run_sql database/05_plsql_demo.sql
.venv/bin/python -m scripts.run_sql database/06_verification.sql
```

- `03` shows INSERT/UPDATE/DELETE before/after and mapping cascade, then rolls back. Q1–Q15 cover filters, multi-table joins, outer joins, grouping/HAVING, correlated subqueries, EXISTS/NOT EXISTS and ranking.
- `05` uses `SET SERVEROUTPUT ON`, calls both business procedures and both SQL-callable functions, processes two tasks through an explicit cursor, shows completion/reopen and memory timestamp triggers, catches expected validation errors, proves invalid-tag rollback, and verifies zero demo projects after rollback.
- `06` prints eight app-table counts, constraints and program statuses and checks linked-project consistency.

Show the actual saved outputs in `docs/evidence/`. Original docs captures are retained as historical baseline evidence. All destructive-looking demo operations operate on temporary rows or are rolled back. Oracle identity sequences can have gaps after rolled-back inserts; this is expected and is not lost business data.
