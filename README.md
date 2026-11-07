# ContextDB

ContextDB is a persistent project memory application for AI-assisted work. It keeps requirements, decisions, constraints, bugs, solutions, findings, and rules in one place so useful knowledge can carry across tasks and conversations.

The idea is simple: record what matters as a project evolves, then retrieve the relevant knowledge when starting the next piece of work. Instead of explaining the project from scratch each time, you can build a focused context prompt to use in your preferred AI tool.

## Current capabilities

- **Project workspace:** Create and manage projects, with an overview of open tasks, stored memories, and recent activity.
- **Memory library:** Add, edit, and organize project knowledge with memory types, importance levels, and tags. Search and filter memories, and link them to tasks or recorded sessions.
- **Task tracking:** Create tasks, assign them to agent records, and track priorities and progress through open, in-progress, blocked, and completed states.
- **Agent and session history:** Browse recorded agents, their assigned tasks, session history, and linked knowledge.
- **Context builder:** Select a project, filter its memories, and generate a ranked, copyable context prompt. Ranking uses importance and tag count, making the selection predictable.
- **Project memory score:** View an aggregate score for the knowledge stored in a project.

For example, you can save an architecture decision and a bug fix as memories, link them to the relevant work, and include them in the context for a later task.

## How it is built

ContextDB uses a **React + Vite** frontend, a **FastAPI** backend, and an **Oracle database** with SQL and PL/SQL logic. It currently stores and retrieves project knowledge; agent execution and LLM calls happen outside the application.

- `frontend/` — Web interface for the workspace and context builder.
- `backend/` — REST API for project data, memory retrieval, and context assembly.
- `database/` — Database schema, SQL scripts, and PL/SQL programs.
