"""Run a repository SQL*Plus script without credentials in argv or captured output.
Usage: python -m scripts.run_sql database/04_plsql_programs.sql
Requires an Oracle SQL*Plus client on PATH and backend/.env.
"""

from pathlib import Path
import re
import subprocess
import sys
from backend.config import oracle_settings


def main():
    path = Path(sys.argv[1]).resolve()
    if not path.is_file() or path.suffix != ".sql":
        raise SystemExit("Provide a SQL script path")
    config = oracle_settings()
    if any("\n" in str(v) or "\r" in str(v) or '"' in str(v) for v in config.values()):
        raise SystemExit(
            "Use interactive SQL*Plus for connection values containing quotes/newlines"
        )
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_$#]*", config["user"]):
        raise SystemExit("Use interactive SQL*Plus for quoted schema names")
    script = (
        "SET ECHO OFF\nSET VERIFY OFF\nSET DEFINE OFF\n"
        f"WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK\n"
        f'CONNECT {config["user"]}/"{config["password"]}"@{config["dsn"]}\n'
        f'@"{path}"\nEXIT\n'
    )
    result = subprocess.run(
        ["sqlplus", "-L", "-S", "/nolog"], input=script, text=True, capture_output=True
    )
    output = (result.stdout + result.stderr).replace(config["password"], "[REDACTED]")
    print(output, end="")
    sys.exit(
        1 if result.returncode or re.search(r"(^|\n)(ORA-|SP2-|PLS-)", output) else 0
    )


if __name__ == "__main__":
    main()
