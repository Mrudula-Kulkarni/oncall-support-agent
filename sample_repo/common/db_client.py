"""Thin Postgres wrapper shared by all services."""

import logging
import time

import psycopg2
from psycopg2.pool import ThreadedConnectionPool

log = logging.getLogger(__name__)

DEFAULT_CONNECT_TIMEOUT_SECONDS = 5.0
DEFAULT_STATEMENT_TIMEOUT_MS = 3000


class DBClient:
    def __init__(self, dsn, connect_timeout=DEFAULT_CONNECT_TIMEOUT_SECONDS,
                 statement_timeout_ms=DEFAULT_STATEMENT_TIMEOUT_MS, pool_size=10):
        self.dsn = dsn
        self.connect_timeout = connect_timeout
        self.statement_timeout_ms = statement_timeout_ms
        self._pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=pool_size,
            dsn=dsn,
            connect_timeout=int(connect_timeout),
        )

    def execute(self, query, params=None):
        conn = self._pool.getconn()
        started = time.time()
        try:
            with conn.cursor() as cur:
                cur.execute(f"SET LOCAL statement_timeout = {self.statement_timeout_ms}")
                cur.execute(query, params or ())
                conn.commit()
                return cur.rowcount
        except psycopg2.OperationalError:
            conn.rollback()
            log.error("db.operational_error query_ms=%d", int((time.time() - started) * 1000))
            raise
        finally:
            self._pool.putconn(conn)

    def fetch_one(self, query, params=None):
        conn = self._pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"SET LOCAL statement_timeout = {self.statement_timeout_ms}")
                cur.execute(query, params or ())
                return cur.fetchone()
        finally:
            self._pool.putconn(conn)
