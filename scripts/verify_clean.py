"""Verify all SQL scripts in a NEW temporary schema on the existing local container.
Never resets the application schema. Removes only its own randomly named user.
Run: python -m scripts.verify_clean (requires docker exec SYS access).
"""

import os
from pathlib import Path
import secrets
import subprocess
import sys
import uuid
import oracledb
from backend.config import oracle_settings

container = os.getenv("ORACLE_CONTAINER", "oracle-db")
username = "CDB_VERIFY_" + uuid.uuid4().hex[:12].upper()
password = "V" + secrets.token_hex(24)


def admin(sql):
    result = subprocess.run(
        ["docker", "exec", "-i", container, "sqlplus", "-L", "-S", "/", "as", "sysdba"],
        input="WHENEVER SQLERROR EXIT SQL.SQLCODE\nALTER SESSION SET CONTAINER=FREEPDB1;\n"
        + sql
        + "\nEXIT\n",
        text=True,
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError(
            (result.stdout + result.stderr).replace(password, "[REDACTED]")
        )


created = False
try:
    admin(
        f'CREATE USER {username} IDENTIFIED BY "{password}" DEFAULT TABLESPACE USERS QUOTA 100M ON USERS;\nGRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER TO {username};'
    )
    created = True
    env = {
        **os.environ,
        "ORACLE_USER": username,
        "ORACLE_PASSWORD": password,
        "ORACLE_DSN": oracle_settings()["dsn"],
    }
    log = []
    for name in [
        "01_schema",
        "02_seed",
        "04_plsql_programs",
        "03_crud_and_queries",
        "05_plsql_demo",
        "06_verification",
    ]:
        result = subprocess.run(
            [sys.executable, "-m", "scripts.run_sql", f"database/{name}.sql"],
            env=env,
            text=True,
            capture_output=True,
        )
        log.append(
            f"=== {name}: exit {result.returncode} ===\n"
            + result.stdout
            + result.stderr
        )
        if result.returncode:
            raise RuntimeError(log[-1])
    with oracledb.connect(
        user=username, password=password, dsn=env["ORACLE_DSN"]
    ) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM user_tables")
            assert cursor.fetchone()[0] == 8
    log.append("PASS: isolated schema has exactly eight total tables.")
    guards = []
    for name in ["01_schema", "02_seed"]:
        result = subprocess.run(
            [sys.executable, "-m", "scripts.run_sql", f"database/{name}.sql"],
            env=env,
            text=True,
            capture_output=True,
        )
        assert result.returncode != 0 and "ORA-20010" in result.stdout
        guards.append(
            f"PASS: repeated {name} refused existing data as expected.\n"
            + result.stdout
        )
    Path("docs/evidence/initialization_guards.txt").write_text("\n".join(guards))
    Path("docs/evidence/clean_schema_verification.txt").write_text("\n".join(log))
    print(
        "PASS: six SQL scripts executed in isolated schema; output saved to docs/evidence/clean_schema_verification.txt"
    )
finally:
    # Only the random user created by this invocation is eligible for cleanup.
    if created:
        admin(f"DROP USER {username} CASCADE;")
