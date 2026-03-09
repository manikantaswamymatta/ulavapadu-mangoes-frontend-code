import json
import os
import re
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

DEFAULT_DB_SCHEMA = "ulavapadumangoes_schema"


def _read_database_url_from_json() -> Optional[str]:
    candidates = [
        Path(__file__).resolve().parent / "creds" / "db_creds.json",
    ]
    for path in candidates:
        if not path.exists():
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            url = payload.get("database_url") or payload.get("DATABASE_URL") or payload.get("url")
            if isinstance(url, str) and url.strip():
                return url.strip()
        except Exception:
            continue
    return None


def _read_db_schema_from_json() -> Optional[str]:
    candidates = [
        Path(__file__).resolve().parent / "creds" / "db_creds.json",
    ]
    for path in candidates:
        if not path.exists():
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            raw = payload.get("db_schema") or payload.get("DB_SCHEMA") or payload.get("schema")
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
        except Exception:
            continue
    return None


def _resolve_db_schema() -> str:
    candidate = os.getenv("DB_SCHEMA") or _read_db_schema_from_json() or DEFAULT_DB_SCHEMA
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", candidate):
        raise RuntimeError(f"Invalid DB schema configured for admin-backend: {candidate!r}")
    return candidate


DB_SCHEMA = _resolve_db_schema()


def get_engine() -> Engine:
    url = _read_database_url_from_json()
    if not url:
        raise RuntimeError(
            "Database URL missing. Set database URL in admin-backend/creds/db_creds.json: "
            '{"database_url":"postgresql://..."}'
        )

    # Avoid strict SSL mode inherited from host env for DBs that use sslmode=prefer.
    os.environ["PGSSLMODE"] = "prefer"

    return create_engine(
        url,
        connect_args={
            "sslmode": "prefer",
            "connect_timeout": 10,
        },
        # Conservative pool to reduce connection pressure in constrained DB roles.
        pool_size=1,
        max_overflow=0,
        pool_timeout=15,
        pool_recycle=300,
        pool_pre_ping=True,
        pool_use_lifo=True,
        future=True,
    )


def run_migrations(engine: Engine) -> None:
    sql = [
        f"ALTER TABLE {DB_SCHEMA}.prices ADD COLUMN IF NOT EXISTS stock_qty INTEGER DEFAULT 0",
        f"ALTER TABLE {DB_SCHEMA}.prices ADD COLUMN IF NOT EXISTS price_1kg DOUBLE PRECISION",
        f"ALTER TABLE {DB_SCHEMA}.prices ADD COLUMN IF NOT EXISTS price_2kg DOUBLE PRECISION",
        f"ALTER TABLE {DB_SCHEMA}.prices ADD COLUMN IF NOT EXISTS price_5kg DOUBLE PRECISION",
        f"ALTER TABLE {DB_SCHEMA}.orders ADD COLUMN IF NOT EXISTS delivery_fee DOUBLE PRECISION DEFAULT 0",
        f"ALTER TABLE {DB_SCHEMA}.orders ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION",
        f"ALTER TABLE {DB_SCHEMA}.payments ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR",
        f"ALTER TABLE {DB_SCHEMA}.payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR",
        f"ALTER TABLE {DB_SCHEMA}.payments ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION",
        f"ALTER TABLE {DB_SCHEMA}.payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR'",
        f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = '{DB_SCHEMA}'
                  AND table_name = 'prices'
                  AND column_name = 'price_250g'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = '{DB_SCHEMA}'
                  AND table_name = 'prices'
                  AND column_name = 'price_1kg'
            ) THEN
                ALTER TABLE {DB_SCHEMA}.prices RENAME COLUMN price_250g TO price_1kg;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = '{DB_SCHEMA}'
                  AND table_name = 'prices'
                  AND column_name = 'price_500g'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = '{DB_SCHEMA}'
                  AND table_name = 'prices'
                  AND column_name = 'price_2kg'
            ) THEN
                ALTER TABLE {DB_SCHEMA}.prices RENAME COLUMN price_500g TO price_2kg;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = '{DB_SCHEMA}'
                  AND table_name = 'prices'
                  AND column_name = 'price_1000g'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = '{DB_SCHEMA}'
                  AND table_name = 'prices'
                  AND column_name = 'price_5kg'
            ) THEN
                ALTER TABLE {DB_SCHEMA}.prices RENAME COLUMN price_1000g TO price_5kg;
            END IF;
        END $$;
        """,
    ]
    with engine.begin() as conn:
        for statement in sql:
            conn.execute(text(statement))
