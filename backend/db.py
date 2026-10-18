"""Small transaction boundary and Oracle-to-JSON conversion helpers."""

import logging
from contextlib import contextmanager
from datetime import datetime, timezone

import oracledb
from fastapi import HTTPException
from .config import oracle_settings

logger = logging.getLogger(__name__)


def database_error(exc):
    error = exc.args[0]
    code = getattr(error, "code", 0)
    # Log codes only: Oracle error text can contain data or connection details.
    logger.warning("Oracle operation failed (code=%s)", code)
    if code in (20001, 20004, 20005):
        return HTTPException(404, "Record not found")
    if code in (20002, 20003, 2291, 1400, 2290, 12899):
        return HTTPException(422, "Invalid value or related record")
    if code in (1, 2292):
        return HTTPException(409, "Record conflicts with existing data")
    return HTTPException(
        503,
        "Oracle is unavailable or schema setup is incomplete. Check server configuration and database scripts.",
    )


@contextmanager
def connection():
    conn = None
    try:
        try:
            settings = oracle_settings()
        except RuntimeError as exc:
            raise HTTPException(503, str(exc)) from exc
        conn = oracledb.connect(**settings, tcp_connect_timeout=5)
        conn.call_timeout = 15000
        with conn.cursor() as cursor:
            cursor.execute("ALTER SESSION SET TIME_ZONE = '+00:00'")
        yield conn
        conn.commit()
    except Exception as exc:
        if conn:
            try:
                conn.rollback()
            except oracledb.Error:
                # A dropped connection may also prevent rollback; preserve the original error.
                logger.warning("Oracle rollback unavailable after connection failure")
        if isinstance(exc, oracledb.Error):
            raise database_error(exc) from exc
        raise
    finally:
        if conn:
            try:
                conn.close()
            except oracledb.Error:
                logger.warning("Oracle connection cleanup failed")


def materialize(value):
    if hasattr(value, "read"):
        return value.read()
    if isinstance(value, datetime) and value.tzinfo is None:
        # Oracle's baseline TIMESTAMP fields have no stored timezone.
        return value.replace(tzinfo=timezone.utc)
    return value


def rows(cursor):
    names = [d[0].lower() for d in cursor.description]
    return [dict(zip(names, map(materialize, row))) for row in cursor]


def query(cursor, sql, **binds):
    cursor.execute(sql, binds)
    return rows(cursor)


def one(cursor, sql, **binds):
    result = query(cursor, sql, **binds)
    if not result:
        raise HTTPException(404, "Record not found")
    return result[0]


def insert(cursor, table, values, id_column):
    # All identifiers come from internal constants/models, never user strings.
    output = cursor.var(oracledb.NUMBER)
    if "content" in values:
        cursor.setinputsizes(content=oracledb.DB_TYPE_CLOB)
    columns = ",".join(values)
    parameters = ",".join(":" + key for key in values)
    cursor.execute(
        f"INSERT INTO {table} ({columns}) VALUES ({parameters}) RETURNING {id_column} INTO :new_id",
        {**values, "new_id": output},
    )
    return int(output.getvalue()[0])


def update(cursor, table, id_column, record_id, values):
    if not values:
        return
    if "content" in values:
        cursor.setinputsizes(content=oracledb.DB_TYPE_CLOB)
    assignments = ",".join(f"{key}=:{key}" for key in values)
    cursor.execute(
        f"UPDATE {table} SET {assignments} WHERE {id_column}=:record_id",
        {**values, "record_id": record_id},
    )
