import re
from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.services.config_service import get_db_creds, get_backend_settings


DEFAULT_DB_SCHEMA = "ulavapadumangoes_schema"

def _int_setting(name: str, default: int) -> int:
    settings = get_backend_settings()
    raw = settings.get(name, default)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


db_creds = get_db_creds()
DATABASE_URL = db_creds.get("DATABASE_URL") or db_creds.get("database_url")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured in backend-code/creds/db_creds.json")


def _get_db_schema() -> str:
    settings = get_backend_settings()
    raw = str(settings.get("DB_SCHEMA", DEFAULT_DB_SCHEMA)).strip()
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", raw):
        raise RuntimeError(f"Invalid DB schema configured: {raw!r}")
    return raw


DB_SCHEMA = _get_db_schema()


engine = create_engine(
    DATABASE_URL,
    # Conservative defaults to avoid exhausting DB connections across services
    pool_size=_int_setting("DB_POOL_SIZE", 1),
    max_overflow=_int_setting("DB_MAX_OVERFLOW", 0),
    pool_timeout=_int_setting("DB_POOL_TIMEOUT", 15),
    pool_recycle=_int_setting("DB_POOL_RECYCLE", 300),
    pool_use_lifo=True,
    pool_pre_ping=True,
    future=True,
)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine,
    future=True,
)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def apply_runtime_migrations() -> None:
    migration_sql = [
        f"ALTER TABLE {DB_SCHEMA}.orders ADD COLUMN IF NOT EXISTS delivery_fee DOUBLE PRECISION DEFAULT 0",
        f"ALTER TABLE {DB_SCHEMA}.orders ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION",
        f"ALTER TABLE {DB_SCHEMA}.payments ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR",
        f"ALTER TABLE {DB_SCHEMA}.payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR",
        f"ALTER TABLE {DB_SCHEMA}.payments ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION",
        f"ALTER TABLE {DB_SCHEMA}.payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR'",
        f"ALTER TABLE {DB_SCHEMA}.prices ADD COLUMN IF NOT EXISTS stock_qty INTEGER DEFAULT 0",
    ]
    with engine.begin() as conn:
        for sql in migration_sql:
            conn.execute(text(sql))
