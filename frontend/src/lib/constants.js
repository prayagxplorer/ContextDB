export const MEMORY_TYPES = [
  "REQUIREMENT",
  "DECISION",
  "CONSTRAINT",
  "BUG",
  "SOLUTION",
  "FINDING",
  "RULE",
];
export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "BLOCKED"];
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
export const human = (value) =>
  value
    ?.replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase()) || "—";
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
