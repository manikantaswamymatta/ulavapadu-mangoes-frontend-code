# Admin Backend

This repository contains only the Python backend that serves the admin APIs.

## Structure

- `admin_api/` - FastAPI application code and requirements.
- `creds/` - database credentials (ignored by git) and helpers.
- misc Python modules (`db.py`, `services.py`).

## Getting started

```bash
cd admin-backend
python -m venv .venv   # optional
. .venv/bin/activate    # or use your environment
pip install -r admin_api/requirements.txt
python -m uvicorn admin_api.main:app --host 0.0.0.0 --port 8090 --reload
```

The backend reads configuration from JSON files only:

- `creds/db_creds.json` → database URL
- `creds/admin_auth.json` → internal API token

All admin endpoints require header `X-Admin-Internal-Token` matching `creds/admin_auth.json`.

API endpoints:

- `GET /health` – health check
- (others used by the web admin panel)
