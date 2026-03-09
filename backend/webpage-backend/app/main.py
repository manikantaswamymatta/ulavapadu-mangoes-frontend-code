import secrets

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import apply_runtime_migrations
from app.routers import orders, pricing, payments
from app.routers import bestsellers
from app.services.config_service import get_backend_settings


app = FastAPI(
    title="Ulavapadu Mangoes E-Commerce API",
    description="Production-ready FastAPI backend for mango ordering platform.",
)


@app.middleware("http")
async def internal_token_guard(request: Request, call_next):
    settings = get_backend_settings()
    expected = str(settings.get("INTERNAL_API_TOKEN") or "").strip()
    if not expected:
        return JSONResponse({"detail": "Backend internal token is not configured."}, status_code=500)

    provided = (request.headers.get("x-internal-token") or "").strip()
    if not secrets.compare_digest(provided, expected):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)

    return await call_next(request)

# Debug: Print all registered routes at startup
@app.on_event("startup")
async def list_routes():
    apply_runtime_migrations()
    print("[DEBUG] Registered routes:")
    for route in app.routes:
        print(f"  {route.path} [{','.join(route.methods)}]")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with frontend domain in production
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"]
)


app.include_router(orders)
app.include_router(pricing)
app.include_router(payments)
app.include_router(bestsellers)
