import json
from functools import lru_cache
from pathlib import Path
from typing import Any


def _repo_root() -> Path:
    # backend-code/app/services -> backend-code
    return Path(__file__).resolve().parents[2]


def _creds_dir() -> Path:
    return _repo_root() / "creds"


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8-sig") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


@lru_cache(maxsize=1)
def get_db_creds() -> dict[str, Any]:
    return _read_json(_creds_dir() / "db_creds.json")


@lru_cache(maxsize=1)
def get_razorpay_creds() -> dict[str, Any]:
    return _read_json(_creds_dir() / "razorpay_creds.json")


@lru_cache(maxsize=1)
def get_backend_settings() -> dict[str, Any]:
    return _read_json(_creds_dir() / "backend_config.json")
