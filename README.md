# ContextDB

Persistent Project Memory & Context Management System. Store project knowledge in Oracle, manage it through React, and assemble a deterministic context bundle for your next LLM conversation. No LLM key is needed and no agent execution is simulated.

## What works

- Live overview, project counts and recent memory/session records.
- Project creation, editing, details and confirmed cascading deletion.
- Memory creation, viewing, editing and deletion; CLOB text, tags, project/task/session associations, keyword/type/importance/tag filters, sorting and pagination.
- Tasks with priorities, assignment/unassignment, status updates, completion/reopen timestamps and linked memories.
- Agent metadata directory with recorded tasks, sessions and related knowledge; session history and details.
- Context Builder with transparent `importance * 10 + tag_count * 5` ranking, tie-breaking by memory ID, configurable filters and copyable prompt.
- Oracle procedures, functions, explicit cursor, triggers, rollback demonstrations and 15 meaningful SQL queries.

## Stack and folders

React 19 + Vite + JavaScript, Tailwind CSS 4, editable shadcn/ui-derived Radix primitives, Lucide icons; FastAPI + Pydantic + python-oracledb Thin mode; local Docker Oracle Database Free.

```text
frontend/src/       React pages, components, API client, hooks and UI tests
backend/            FastAPI routes, request models, SQL repository and tests
database/           Eight-table DDL, seed, queries and PL/SQL scripts
scripts/            SQL*Plus runner, HTTP smoke test, isolated-schema verifier
docs/               Architecture, database, API, report, demo and maintenance guide
docs/evidence/      Actual execution captures from this implementation
```

## Quick start on this existing checkout

Prerequisites: Docker, Python 3.11+ (tested with 3.14.7), Node 22.12+ (tested with 26.10.0), npm, and optionally SQL*Plus. SQL*Plus is an Oracle **client**, not the database server. Run these commands from the repository root.

The existing `oracle-db` container and `oracle-data` volume were preserved. Its application connection settings were moved out of source into ignored `backend/.env`, with file permissions 0600. Do not overwrite that file if it already exists.

```bash
docker start oracle-db
docker exec oracle-db healthcheck.sh
python -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
# Only if backend/.env does not already exist:
# cp backend/.env.example backend/.env
# Edit ORACLE_USER, ORACLE_PASSWORD and ORACLE_DSN to match your existing schema.

# Safe upgrade: adds/replaces only the seven named ContextDB PL/SQL objects.
.venv/bin/python -m scripts.run_sql database/04_plsql_programs.sql
.venv/bin/python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. API documentation: **http://localhost:8000/docs**. Health: **http://localhost:8000/api/health**. Vite proxies `/api` to the backend. `frontend/.env` is unnecessary for the default proxy; `VITE_API_BASE_URL` may contain a public backend URL only.

The verified Oracle connection uses `localhost:1521/FREEPDB1`. Existing schema has other coursework tables: ContextDB scopes its checks to its eight named tables. Do not reset or reseed this database.

## New database on another machine (optional)

Skip this section when reusing `oracle-db`. Compose starts a **separate new volume**; it does not reuse the existing `oracle-data` volume. Do not start both on port 1521. Choose `ORACLE_PORT=1522` for a parallel new instance and use `localhost:1522/FREEPDB1` in its backend configuration.

1. Copy `.env.example` to root `.env`. Set `ORACLE_ADMIN_PASSWORD`, `ORACLE_APP_PASSWORD` to distinct strong local secrets. `ORACLE_APP_USER=contextdb` names the application schema.
2. Start the persistent instance:

```bash
docker compose up -d
docker compose ps
docker compose exec oracle healthcheck.sh
```

The pinned image is `gvenzl/oracle-free:23.26.3-slim`; read its [maintainer setup and supported tags](https://github.com/gvenzl/oci-oracle-free) and the [Oracle Database Free license terms](https://www.oracle.com/downloads/licenses/oracle-free-license.html) before use. The new image/Compose path was configuration-checked, not downloaded and booted during verification; tests used existing Oracle 23.26.2. The image creates `APP_USER` on first initialization. Environment changes do not change passwords inside an already initialized volume.

3. Ensure the application schema has scoped object-creation permissions. Connect as the local container administrator (no password in shell history):

```bash
docker compose exec oracle sqlplus / as sysdba
```

```sql
ALTER SESSION SET CONTAINER=FREEPDB1;
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER TO contextdb;
ALTER USER contextdb QUOTA 100M ON USERS;
EXIT;
```

The API uses the application schema, never SYS/SYSTEM. Change `contextdb` above only if you selected another schema name.

4. Copy `backend/.env.example` to `backend/.env`; set the app username/password and host DSN. Install Python dependencies as above, then initialize **only the new empty schema**:

```bash
.venv/bin/python -m scripts.run_sql database/01_schema.sql
.venv/bin/python -m scripts.run_sql database/02_seed.sql
.venv/bin/python -m scripts.run_sql database/04_plsql_programs.sql
.venv/bin/python -m scripts.run_sql database/06_verification.sql
```

`01_schema.sql` refuses any existing tables; `02_seed.sql` refuses populated application tables. Neither script drops existing data. Use `04` for upgrades. Never use `docker compose down -v` on data you want to keep.

Without host SQL*Plus, copy the SQL files into the container and run them interactively:

```bash
docker compose cp database oracle:/tmp/contextdb-database
docker compose exec oracle sqlplus contextdb@//localhost:1521/FREEPDB1
# Enter the app password at the prompt, then:
# @/tmp/contextdb-database/01_schema.sql
```

Each script ends with `EXIT`; reconnect for the next script. For existing `oracle-db`, use `docker cp database oracle-db:/tmp/contextdb-database` and `docker exec -it oracle-db sqlplus YOUR_APP_USER@//localhost:1521/FREEPDB1`.

## Tests and demonstrations

```bash
# Validation/unit suite; Oracle tests skip unless explicitly enabled.
.venv/bin/python -m pytest backend/tests -q
# Real Oracle integration; temporary projects are cleaned up.
RUN_ORACLE_TESTS=1 .venv/bin/python -m pytest backend/tests -q

# SQL*Plus demonstrations (rollback-only data changes)
.venv/bin/python -m scripts.run_sql database/03_crud_and_queries.sql
.venv/bin/python -m scripts.run_sql database/05_plsql_demo.sql
.venv/bin/python -m scripts.run_sql database/06_verification.sql

# Live HTTP smoke test; run the backend first.
.venv/bin/python -m scripts.http_smoke

cd frontend
npm test
npm run build
# React DOM -> live HTTP -> Oracle tests; backend must be running.
RUN_LIVE_TESTS=1 npm test
npm audit
```

Optional clean-install verification from the repository root:

```bash
.venv/bin/python -m scripts.verify_clean
```

This uses `docker exec` SYS access to create a randomly named temporary user in `FREEPDB1`, runs all six scripts, and drops **only that temporary user** in cleanup. Set `ORACLE_CONTAINER` for a differently named local container. The configured DSN must point to that container's FREEPDB1.

See [verification evidence](docs/VERIFICATION.md) for results and limits, and [the demo walkthrough](docs/DEMO_WALKTHROUGH.md) for the viva narrative.

## Configuration and troubleshooting

- **503 / Oracle unavailable:** run `docker ps -a`, start the existing container, then run its `healthcheck.sh`. Check the three `ORACLE_*` values in `backend/.env`. Server diagnostics log error codes without credentials.
- **Connected but list endpoints fail:** install `04_plsql_programs.sql` with the app schema and inspect `USER_ERRORS`; grant CREATE PROCEDURE/TRIGGER if needed.
- **Port in use:** use the existing container, or change the new Compose port and DSN. Vite's API proxy expects port 8000.
- **Thin mode errors:** use the installed `python-oracledb`; no Oracle Instant Client is required by the API. SQL*Plus installation is separate.
- **Frontend fetch/CORS:** the default Vite proxy needs no frontend env. For a separate backend origin, set `VITE_API_BASE_URL` and list the frontend origin in backend `CORS_ORIGINS`. Restart Vite after env changes.
- **Copy context denied:** the prompt remains selectable; copy manually. Clipboard permissions are browser-dependent and generally require localhost or HTTPS.
- **Timestamps:** original Oracle TIMESTAMP columns contain no zone. This verified database uses UTC; API sessions write UTC and serialize with `+00:00`. The UI displays dates in the browser's local zone. Existing data from a different historical timezone needs an explicit migration before using this convention.
- **Refreshes/deep links:** Vite handles SPA routes. If serving the production `frontend/dist` directory elsewhere, configure history fallback to `index.html` and `/api` proxying separately. `npm run preview` serves a build but does not provide the development `/api` proxy.
- **Local scope:** this is a trusted local course app, without authentication or per-user authorization. Keep FastAPI/Vite bound to loopback. Add authentication before exposing it to other machines.

## Understand and extend

[Architecture](docs/ARCHITECTURE.md) · [Database and ERD](docs/DATABASE.md) · [API](docs/API.md) · [Final course report](docs/Final_Report.md) · [Change map](docs/CHANGE_MAP.md)

Original intermediate report and original SQL output captures remain available unchanged for historical evidence. New evidence is in `docs/evidence/`.
