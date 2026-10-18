"""Local configuration; credentials never have built-in defaults."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))
CORS_ORIGINS = [
    s.strip()
    for s in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if s.strip()
]


def oracle_settings():
    values = {
        key: os.getenv(key) for key in ("ORACLE_USER", "ORACLE_PASSWORD", "ORACLE_DSN")
    }
    if not all(values.values()):
        raise RuntimeError(
            "Set ORACLE_USER, ORACLE_PASSWORD and ORACLE_DSN in backend/.env"
        )
    return dict(
        user=values["ORACLE_USER"],
        password=values["ORACLE_PASSWORD"],
        dsn=values["ORACLE_DSN"],
    )
