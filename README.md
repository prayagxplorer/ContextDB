# Persistent Project Memory & Context Management System

A database-backed memory layer for AI-assisted software engineering.

## Overview

Large language models have limited context windows, which makes long-running project work difficult when important decisions and technical knowledge disappear from the active conversation. This project solves that by persisting project knowledge in a relational database and retrieving it when needed.

Instead of storing only chat history, the system stores structured project memory such as:

- requirements
- architecture decisions
- technical constraints
- tasks and bugs
- solutions and findings
- project-specific rules
- developer and agent context
- session history

The result is a persistent, searchable project memory that can be used to keep AI responses aligned with the real state of the project.

## Core idea

User / Developer
  -> AI Agent / Application
  -> Context Management Layer
  -> Oracle Database
  -> Relevant memory retrieval
  -> Context Builder
  -> LLM / AI Response

The database acts as the long-term memory of the project. Important knowledge is stored once and retrieved later when it is relevant.

## Main goals

- persist project knowledge across sessions
- support user, project, agent, and session tracking
- store memories, requirements, tasks, bugs, and decisions
- associate memories with tags and related records
- support search and retrieval by keyword, project, task, and type
- provide CRUD operations and SQL query demonstrations
- expose a simple dashboard or API for context retrieval

## Key entities

The core schema is centered around:

- User
- Project
- Agent
- Session
- Memory
- Tag
- Requirement
- Architecture Decision
- Task
- Bug
- Solution
- Memory relationships

A memory is not just a conversation log; it is a reusable piece of project knowledge.

## Why this matters

A developer may say:

> "We use PostgreSQL because payment processing requires transactional consistency. Do not switch to MongoDB without approval."

Later, the AI may be asked a related question without that instruction still in context. By storing that information in the database, the AI can retrieve it and respond consistently.

## Example use cases

- retrieve project constraints before recommending a new technology
- continue work from earlier sessions
- recollect previous architectural decisions
- track unresolved bugs and attempted solutions
- build project-specific context before answering a technical question

## Architecture

This project is designed as a layered system:

1. Database layer
   - Oracle SQL / PL/SQL
   - relational schema and constraints
   - indexing, joins, nested queries, aggregates, transactions

2. Application layer
   - CRUD operations
   - search and retrieval logic
   - project memory services

3. AI context layer
   - query project knowledge
   - build context for an LLM
   - return relevant memories to the agent

4. Frontend layer
   - dashboard
   - project and memory management pages
   - search/context retrieval interface

## Recommended stack

- Database: Oracle Database
- Query language: Oracle SQL / PL/SQL
- Backend: Python + FastAPI (recommended), or similar lightweight framework
- Frontend: React or simple HTML/CSS/JavaScript
- AI integration: optional LLM API layered on top of context retrieval

## Retrieval approach

The initial version does not need advanced vector search. A practical first implementation can rank results using:

- project match
- keyword match
- tag match
- importance level
- recency
- related task or memory

This keeps the system focused on relational database fundamentals while still serving as a valid project-memory layer.

## Suggested project structure

```text
project-root/
├── frontend/
├── backend/
├── database/
│   ├── schema/
│   ├── tables/
│   ├── constraints/
│   ├── seed/
│   ├── queries/
│   └── indexes/
├── docs/
├── README.md
└── Persistent_Project_Memory_Context_Management_System.md
```

## Development phases

1. Requirements and scope
2. ER modeling
3. Relational schema design
4. Oracle implementation
5. CRUD and SQL query work
6. Backend API and search logic
7. Frontend dashboard
8. AI context integration

## Key principle

The system should store knowledge about the project, not just raw conversation logs. This makes the database useful even after earlier sessions are no longer in memory.

## Security and integrity

The design should include:

- project-level isolation
- foreign keys and validation
- unique constraints
- input sanitization
- secure database access
- protection against SQL injection
- transaction-safe inserts and updates

## Future enhancements

- semantic/vector search
- automatic memory extraction from conversations
- contradiction detection between old and new decisions
- memory versioning and history tracking
- project knowledge graph representation
- autonomous AI task execution backed by persistent memory

## Summary

This project is a practical demonstration of how a relational database can act as the long-term memory for an AI software-engineering workflow. It is intended to be simple, structured, and academic in scope, while still modeling the real problem of context loss across sessions.
