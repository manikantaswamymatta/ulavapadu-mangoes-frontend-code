from pathlib import Path
import sys

from fastapi import FastAPI


ROOT_DIR = Path(__file__).resolve().parent.parent
WEB_BACKEND_DIR = ROOT_DIR / "webpage-backend"
ADMIN_BACKEND_DIR = ROOT_DIR / "admin-backend"


def _prepend_python_path(path: Path) -> None:
    raw = str(path)
    if raw not in sys.path:
        sys.path.insert(0, raw)


# Import website API first from webpage-backend/app/main.py
_prepend_python_path(WEB_BACKEND_DIR)
from app.main import app as website_api_app  # type: ignore  # noqa: E402

# Import admin API from admin-backend/admin_api/main.py
_prepend_python_path(ADMIN_BACKEND_DIR)
from admin_api.main import app as admin_api_app  # type: ignore  # noqa: E402


app = FastAPI(
    title="Ulavapadu Mangoes Unified API",
    description=(
        "Single-process deployment that serves both website backend API and admin backend API."
    ),
)


@app.get("/health")
def unified_health() -> dict:
    return {"ok": True, "service": "unified-backend"}


# Admin API remains isolated under /admin-api/*
app.mount("/admin-api", admin_api_app)

# Website API remains at root paths for backward compatibility.
app.mount("/", website_api_app)
