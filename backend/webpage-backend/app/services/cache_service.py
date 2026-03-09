import time
from threading import Lock
from typing import Any

from app.services.config_service import get_backend_settings


def _cache_ttl_seconds() -> int:
    raw = get_backend_settings().get("API_CACHE_TTL_SECONDS", 18000)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return 18000


DEFAULT_CACHE_TTL_SECONDS = _cache_ttl_seconds()  # 5 hours

_cache: dict[str, tuple[float, Any]] = {}
_lock = Lock()


def get_cached(key: str, ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS) -> Any | None:
    now = time.time()
    with _lock:
        value = _cache.get(key)
        if not value:
            return None
        timestamp, data = value
        if now - timestamp >= ttl_seconds:
            _cache.pop(key, None)
            return None
        return data


def set_cached(key: str, data: Any) -> None:
    with _lock:
        _cache[key] = (time.time(), data)


def invalidate_cache(*keys: str) -> None:
    with _lock:
        for key in keys:
            _cache.pop(key, None)
