# API guide

Interactive request/response schemas: http://localhost:8000/docs. OpenAPI: `/openapi.json`. Base prefix `/api`. Local trusted app; no authentication is implemented. Do not expose it publicly without authorization controls.

## Routes

- `GET /health`: actual application table counts; 503 on configuration/database failure. No DSN/password in response.
- `GET /overview?project_id=1`: actual project/active/open-task/memory counts, recent memories and five latest sessions.
- `GET /projects`: project metadata plus independent task/memory/open counts. `GET /projects/{id}` retrieves one.
- `POST /projects` creates; `PATCH /projects/{id}` changes name/description/status; `DELETE /projects/{id}` cascades project dependents.
- `GET /memories`: filters `project_id`, `memory_type`, `min_importance`, `keyword`, `tag_id`, `task_id`; sort `relevance` (default), `recent`, `title`; pagination `limit=50` (1–200), `offset=0`. Returns an array for baseline compatibility, with `tags`, `tag_ids`, `tag_count`, and `relevance_score` on each item.
- `GET /memories/{id}`, `POST /memories`, `PATCH /memories/{id}` (or compatible PUT partial update), `DELETE /memories/{id}`.
- `GET /tasks`: `project_id`, `status`, `priority`, `agent_id`, `limit`, `offset`; sorted by critical/high/medium/low, newest ID first. `GET /tasks/{id}` includes up to 50 linked memories (use the memory list's `task_id` filter for more).
- `POST /tasks`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}`.
- `PUT /tasks/{id}/status`: `{"status":"COMPLETED"}`; `PUT /tasks/{id}/assignment`: `{"agent_id":1}` or `{"agent_id":null}`. Both execute stored procedures, as do task creation/PATCH.
- `GET /agents`, `GET /agents/{id}` with up to 200 tasks, sessions and associated memories. `GET /agents/{id}/tasks` and `/sessions` support limit/offset. Agent detail includes all projects, not an invented direct memory owner.
- `GET /sessions`: `project_id`, `agent_id`, `status`, limit/offset; newest start time first. `GET /sessions/{id}` joins project, user and agent metadata.
- `GET /tags`: existing controlled labels. Tag definition CRUD is intentionally outside scope; memory tag associations are editable.
- `GET /context-builder/{project_id}`: optional `limit=5` (1–20), `memory_type`, `min_importance=1`, `tag_id`. Returns `project_id`, `project_name`, `memories`, `ranking_formula`, `llm_context_prompt`.

## Example memory transaction

IDs below illustrate the baseline seed. Use actual IDs from your instance.

```json
{
  "project_id": 1,
  "title": "Keep database operations transactional",
  "content": "A failed tag association must roll back its memory insert.\n",
  "memory_type": "RULE",
  "importance": 5,
  "task_id": 12,
  "session_id": 11,
  "tag_ids": [1, 4]
}
```

POST `/api/memories` returns 201 and the full stored memory, including its generated `memory_id`, joined project name, tag objects, UTC ISO timestamps and numerical score (60 for importance 5/two unique tags). The memory and tags commit together. Duplicate tag IDs are deduplicated.

PATCH `/api/memories/{id}` with `{"content":"Revised knowledge","tag_ids":[],"task_id":null}` changes content, removes mappings, and clears task association. Omitted fields stay unchanged. Null is accepted only for optional task/session/agent associations. Project IDs cannot be changed after memory/task creation. Text must be nonblank; content preserves whitespace, including trailing newlines. Content is capped at 1,000,000 characters, titles at 200, descriptions at 1,000, project names at 150, tag selections at 100.

Task creation requires `project_id`, `title`, `description`; defaults priority MEDIUM, status OPEN, agent null. Project creation requires `project_name`, `description`; defaults ACTIVE. Unknown JSON fields are rejected.

## Errors and transaction behavior

- 201: created record. 200: successful read/update/delete.
- 404: missing entity (including selected project). Existing empty project context is **200**, with no selected memories and explanatory prompt text.
- 422: invalid input, disallowed type/status, required field set to null, invalid tag/agent FK, cross-project task/session association, or invalid pagination.
- 409: duplicate unique name or relational conflict.
- 503: missing configuration, Oracle connection failure, or missing/unavailable schema programs. Browser messages omit raw Oracle diagnostics; server logs retain error codes.

Failures roll back all changes in that API call. Mutating requests refresh frontend views only after a successful response. DELETE memory cascades mappings; DELETE task preserves memories and clears `task_id`; DELETE project cascades tasks/sessions/memories/mappings.

Keyword input uses bound `INSTR`/`DBMS_LOB.INSTR`, so quotes and wildcard characters are literal search text. Internal sort values map through a fixed allowlist. Identifiers in generic SQL helpers originate only in code, never request parameters. UTC timestamps preserve the inspected database convention.
