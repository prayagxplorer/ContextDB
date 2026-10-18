"""Validated request contracts; PATCH distinguishes omitted values from null."""

from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator

ID = Annotated[int, Field(gt=0)]
Title = Annotated[str, Field(min_length=1, max_length=200)]
Description = Annotated[str, Field(min_length=1, max_length=1000)]
MemoryType = Literal[
    "REQUIREMENT", "DECISION", "CONSTRAINT", "BUG", "SOLUTION", "FINDING", "RULE"
]
Status = Literal["OPEN", "IN_PROGRESS", "COMPLETED", "BLOCKED"]
Priority = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
ProjectStatus = Literal["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]
Content = Annotated[str, Field(min_length=1, max_length=1_000_000)]


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)

    @field_validator("*", mode="before")
    @classmethod
    def validate_text(cls, value, info):
        if isinstance(value, str):
            if not value.strip():
                raise ValueError("Text cannot be blank")
            # Preserve whitespace in knowledge, including code and final newlines.
            return value if info.field_name == "content" else value.strip()
        return value


class MemoryCreate(Request):
    project_id: ID
    title: Title
    content: Content
    memory_type: MemoryType
    importance: int = Field(default=3, ge=1, le=5)
    session_id: ID | None = None
    task_id: ID | None = None
    tag_ids: list[ID] = Field(default_factory=list, max_length=100)


class Patch(Request):
    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for field in self.model_fields_set - {"task_id", "session_id", "agent_id"}:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class MemoryPatch(Patch):
    # A memory stays in its original project; optional associations may be cleared.
    title: Title | None = None
    content: Content | None = None
    memory_type: MemoryType | None = None
    importance: Annotated[int, Field(ge=1, le=5)] | None = None
    session_id: ID | None = None
    task_id: ID | None = None
    tag_ids: list[ID] | None = Field(default=None, max_length=100)


class TaskCreate(Request):
    project_id: ID
    title: Title
    description: Description
    priority: Priority = "MEDIUM"
    status: Status = "OPEN"
    agent_id: ID | None = None


class TaskPatch(Patch):
    title: Title | None = None
    description: Description | None = None
    priority: Priority | None = None
    status: Status | None = None
    agent_id: ID | None = None


class TaskStatus(Request):
    status: Status


class Assignment(Request):
    agent_id: ID | None


class ProjectCreate(Request):
    project_name: Annotated[str, Field(min_length=1, max_length=150)]
    description: Description
    status: ProjectStatus = "ACTIVE"


class ProjectPatch(Patch):
    project_name: Annotated[str, Field(min_length=1, max_length=150)] | None = None
    description: Description | None = None
    status: ProjectStatus | None = None
