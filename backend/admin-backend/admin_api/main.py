from datetime import date
import json
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from pydantic import BaseModel

from db import get_engine, run_migrations
from services import (
    add_category,
    add_product,
    delete_category,
    delete_product,
    get_categories,
    get_dashboard_metrics,
    get_orders,
    get_payments,
    get_products,
    update_order_status,
    update_product,
)

app = FastAPI(
    title="Ulavapadu Mangoes Admin API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = get_engine()
run_migrations(engine)


def _read_internal_token() -> str:
    path = Path(__file__).resolve().parent.parent / "creds" / "admin_auth.json"
    if not path.exists():
        raise RuntimeError(
            "Missing admin auth config at admin-backend/creds/admin_auth.json"
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    token = payload.get("internalToken")
    if not isinstance(token, str) or not token.strip():
        raise RuntimeError(
            "Invalid admin auth config. Expected non-empty 'internalToken' in admin-backend/creds/admin_auth.json"
        )
    return token.strip()


INTERNAL_TOKEN = _read_internal_token()


def require_internal_token(
    x_admin_internal_token: Optional[str] = Header(default=None, alias="X-Admin-Internal-Token"),
):
    if x_admin_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _sanitize_df(df: pd.DataFrame) -> list[dict]:
    if df.empty:
        return []
    clean = df.where(pd.notnull(df), None)
    return clean.to_dict(orient="records")


class UpdateOrderStatusPayload(BaseModel):
    status: str


class AddProductPayload(BaseModel):
    name: str
    image: str
    price_1kg: Optional[float] = None
    price_2kg: Optional[float] = None
    price_5kg: Optional[float] = None
    quantity: int
    category_id: Optional[int] = None
    description: Optional[str] = None
    bestseller: bool = False


class UpdateProductPayload(BaseModel):
    product_name: str
    description: Optional[str] = None
    image: Optional[str] = None
    category_id: Optional[int] = None
    price_1kg: Optional[float] = None
    price_2kg: Optional[float] = None
    price_5kg: Optional[float] = None
    stock_qty: int
    bestseller: bool = False


class AddCategoryPayload(BaseModel):
    name: str
    image: Optional[str] = None


@app.get("/health", dependencies=[Depends(require_internal_token)])
def health():
    return {"ok": True}


@app.get("/openapi.json", dependencies=[Depends(require_internal_token)])
def openapi_schema():
    return app.openapi()


@app.get("/docs", dependencies=[Depends(require_internal_token)])
def docs():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Ulavapadu Mangoes Admin API - Docs",
    )


@app.get("/dashboard", dependencies=[Depends(require_internal_token)])
def dashboard():
    return get_dashboard_metrics(engine)


@app.get("/orders", dependencies=[Depends(require_internal_token)])
def orders(
    phone: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 200,
):
    df = get_orders(engine, phone=phone, status=status, from_date=from_date, to_date=to_date, limit=limit)
    return _sanitize_df(df)


@app.patch("/orders/{order_id}/status", dependencies=[Depends(require_internal_token)])
def patch_order_status(order_id: int, payload: UpdateOrderStatusPayload):
    try:
        update_order_status(engine, order_id, payload.status)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"ok": True}


@app.get("/payments", dependencies=[Depends(require_internal_token)])
def payments(
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 300,
):
    df = get_payments(engine, status=status, from_date=from_date, to_date=to_date, limit=limit)
    return _sanitize_df(df)


@app.get("/products", dependencies=[Depends(require_internal_token)])
def products():
    return _sanitize_df(get_products(engine))


@app.post("/products", dependencies=[Depends(require_internal_token)])
def create_product(payload: AddProductPayload):
    try:
        product_id = add_product(
            engine=engine,
            name=payload.name,
            image=payload.image,
            price_1kg=payload.price_1kg,
            price_2kg=payload.price_2kg,
            price_5kg=payload.price_5kg,
            quantity=payload.quantity,
            category_id=payload.category_id,
            description=payload.description,
            bestseller=payload.bestseller,
        )
        return {"product_id": product_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.put("/products/{product_id}", dependencies=[Depends(require_internal_token)])
def put_product(product_id: int, payload: UpdateProductPayload):
    try:
        update_product(
            engine=engine,
            product_id=product_id,
            product_name=payload.product_name,
            description=payload.description,
            image=payload.image,
            category_id=payload.category_id,
            price_1kg=payload.price_1kg,
            price_2kg=payload.price_2kg,
            price_5kg=payload.price_5kg,
            stock_qty=payload.stock_qty,
            bestseller=payload.bestseller,
        )
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.delete("/products/{product_id}", dependencies=[Depends(require_internal_token)])
def remove_product(product_id: int):
    try:
        delete_product(engine, product_id)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/categories", dependencies=[Depends(require_internal_token)])
def categories():
    return _sanitize_df(get_categories(engine))


@app.post("/categories", dependencies=[Depends(require_internal_token)])
def create_category(payload: AddCategoryPayload):
    try:
        category_id = add_category(engine, payload.name, payload.image)
        return {"id": category_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.delete("/categories/{category_id}", dependencies=[Depends(require_internal_token)])
def remove_category(category_id: int):
    try:
        delete_category(engine, category_id)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
