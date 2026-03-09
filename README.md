# Ulavapadu Project

This repository is segregated into backend and frontend as requested.

## Structure

- `backend/`
  - `webpage-backend/` (website FastAPI backend)
  - `admin-backend/` (admin FastAPI backend)
  - `unified_backend/` (single FastAPI entry file mounting both API sets)
  - `requirements.railway.txt`, `Procfile`, `railway.toml`, `nixpacks.toml`
- `frontend/`
  - `webpage-frontend/` (single Next.js app for website + admin page)

## Run Backend (single command)

From `backend/`:

```bash
uvicorn unified_backend.main:app --host 0.0.0.0 --port $PORT
```

- Website API is served at `/`
- Admin API is served at `/admin-api`

## Run Frontends

From `frontend/webpage-frontend/`:

```bash
npm run dev
```

- Website frontend: `http://localhost:3000`
- Admin page inside same app: `http://localhost:3000/admin`
- Admin link is available in footer.

## Railway Notes

- Backend: deploy `backend/` as one Railway service (single command above).
- Frontend: deploy `frontend/webpage-frontend` as one Railway (or Vercel) service.
