import json
from datetime import date
from typing import Optional

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from db import DB_SCHEMA


def _qname(table: str) -> str:
    return f"{DB_SCHEMA}.{table}"

ORDER_STATUSES = [
    "created",
    "payment_initiated",
    "paid",
    "booked",
    "order confirmed",
    "order shipped",
    "order delivered",
    "cancelled",
]


def get_dashboard_metrics(engine: Engine) -> dict:
    sql = text(
        f"""
        SELECT
            (SELECT COUNT(*) FROM {_qname('orders')}) AS total_orders,
            (SELECT COUNT(*) FROM {_qname('orders')} WHERE DATE(created_at) = CURRENT_DATE) AS today_orders,
            (SELECT COUNT(*) FROM {_qname('orders')} WHERE status = 'paid') AS paid_orders,
            (SELECT COALESCE(SUM(total_amount), 0) FROM {_qname('orders')} WHERE status = 'paid') AS paid_revenue,
            (SELECT COUNT(*) FROM {_qname('prices')}) AS total_products,
            (SELECT COUNT(*) FROM {_qname('prices')} WHERE COALESCE(stock_qty,0) <= 5) AS low_stock_products,
            (SELECT COUNT(*) FROM {_qname('payments')}) AS total_payments,
            (SELECT COUNT(*) FROM {_qname('payments')} WHERE status = 'captured') AS captured_payments
        """
    )
    with engine.connect() as conn:
        row = conn.execute(sql).mappings().first()
    return dict(row) if row else {}


def get_orders(
    engine: Engine,
    phone: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 200,
) -> pd.DataFrame:
    sql = text(
        f"""
        SELECT
            o.id AS order_id,
            o.status,
            o.customer_name,
            o.customer_phone,
            o.customer_email,
            o.address,
            o.items,
            o.delivery_fee,
            o.total_amount,
            o.created_at,
            o.updated_at,
            p.payment_id,
            p.transaction_id,
            p.status AS payment_status,
            p.amount AS payment_amount,
            p.currency
        FROM {_qname('orders')} o
        LEFT JOIN LATERAL (
            SELECT *
            FROM {_qname('payments')} p2
            WHERE p2.order_id = o.id
            ORDER BY
                CASE WHEN p2.status = 'captured' THEN 0 ELSE 1 END,
                p2.payment_id DESC
            LIMIT 1
        ) p ON TRUE
        WHERE (:phone IS NULL OR o.customer_phone = :phone)
          AND (:status IS NULL OR o.status = :status)
          AND (:from_date IS NULL OR DATE(o.created_at) >= :from_date)
          AND (:to_date IS NULL OR DATE(o.created_at) <= :to_date)
        ORDER BY o.created_at DESC
        LIMIT :limit
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(
            sql,
            conn,
            params={
                "phone": phone if phone else None,
                "status": status if status else None,
                "from_date": from_date,
                "to_date": to_date,
                "limit": int(limit),
            },
        )
    return df


def parse_items_column(value: str) -> list[dict]:
    if not value:
        return []
    try:
        payload = json.loads(value)
        return payload if isinstance(payload, list) else []
    except Exception:
        return []


def update_order_status(engine: Engine, order_id: int, new_status: str) -> None:
    status_normalized = new_status.strip().lower()
    if status_normalized not in ORDER_STATUSES:
        raise ValueError(f"Invalid status: {new_status}")

    with engine.connect() as conn:
        row = conn.execute(
            text(f"SELECT status FROM {_qname('orders')} WHERE id = :order_id"),
            {"order_id": int(order_id)},
        ).fetchone()
        if not row:
            raise ValueError(f"Order id {order_id} not found.")

    sql = text(
        f"""
        UPDATE {_qname('orders')}
        SET status = :status, updated_at = NOW()
        WHERE id = :order_id
        """
    )
    with engine.begin() as conn:
        res = conn.execute(sql, {"status": status_normalized, "order_id": int(order_id)})
        if res.rowcount == 0:
            raise ValueError(f"Order id {order_id} not found.")


def get_payments(
    engine: Engine,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 300,
) -> pd.DataFrame:
    sql = text(
        f"""
        SELECT
            p.payment_id,
            p.order_id,
            p.gateway_order_id,
            p.transaction_id,
            p.amount,
            p.currency,
            p.status,
            o.customer_name,
            o.customer_phone,
            o.total_amount,
            o.created_at
        FROM {_qname('payments')} p
        LEFT JOIN {_qname('orders')} o ON o.id = p.order_id
        WHERE (:status IS NULL OR p.status = :status)
          AND (:from_date IS NULL OR DATE(o.created_at) >= :from_date)
          AND (:to_date IS NULL OR DATE(o.created_at) <= :to_date)
        ORDER BY o.created_at DESC NULLS LAST, p.payment_id DESC
        LIMIT :limit
        """
    )
    with engine.connect() as conn:
        return pd.read_sql(
            sql,
            conn,
            params={
                "status": status if status else None,
                "from_date": from_date,
                "to_date": to_date,
                "limit": int(limit),
            },
        )


def get_categories(engine: Engine) -> pd.DataFrame:
    sql = text(
        f"""
        SELECT id, name, image
        FROM {_qname('categories')}
        ORDER BY id ASC
        """
    )
    with engine.connect() as conn:
        return pd.read_sql(sql, conn)


def add_category(engine: Engine, name: str, image: Optional[str]) -> int:
    sql = text(
        f"""
        INSERT INTO {_qname('categories')} (name, image)
        VALUES (:name, :image)
        RETURNING id
        """
    )
    with engine.begin() as conn:
        row = conn.execute(sql, {"name": name.strip(), "image": (image or "").strip() or None}).fetchone()
    return int(row[0])


def delete_category(engine: Engine, category_id: int) -> None:
    sql = text(f"DELETE FROM {_qname('categories')} WHERE id = :id")
    with engine.begin() as conn:
        res = conn.execute(sql, {"id": int(category_id)})
        if res.rowcount == 0:
            raise ValueError(f"Category id {category_id} not found.")


def get_products(engine: Engine) -> pd.DataFrame:
    sql = text(
        f"""
        SELECT
            p.product_id,
            p.product_name,
            p.description,
            p.image,
            p.category_id,
            c.name AS category_name,
            p.price_1kg,
            p.price_2kg,
            p.price_5kg,
            COALESCE(p.stock_qty, 0) AS stock_qty,
            COALESCE(p.bestseller, FALSE) AS bestseller
        FROM {_qname('prices')} p
        LEFT JOIN {_qname('categories')} c ON c.id = p.category_id
        ORDER BY p.product_id ASC
        """
    )
    with engine.connect() as conn:
        return pd.read_sql(sql, conn)


def update_product(
    engine: Engine,
    product_id: int,
    product_name: str,
    description: Optional[str],
    image: Optional[str],
    category_id: Optional[int],
    price_1kg: Optional[float],
    price_2kg: Optional[float],
    price_5kg: Optional[float],
    stock_qty: int,
    bestseller: bool,
) -> None:
    sql = text(
        f"""
        UPDATE {_qname('prices')}
        SET
            product_name = :product_name,
            description = :description,
            image = :image,
            category_id = :category_id,
            price_1kg = :price_1kg,
            price_2kg = :price_2kg,
            price_5kg = :price_5kg,
            stock_qty = :stock_qty,
            bestseller = :bestseller
        WHERE product_id = :product_id
        """
    )
    with engine.begin() as conn:
        res = conn.execute(
            sql,
            {
                "product_id": int(product_id),
                "product_name": product_name.strip(),
                "description": (description or "").strip() or None,
                "image": (image or "").strip() or None,
                "category_id": category_id,
                "price_1kg": price_1kg,
                "price_2kg": price_2kg,
                "price_5kg": price_5kg,
                "stock_qty": int(stock_qty),
                "bestseller": bool(bestseller),
            },
        )
        if res.rowcount == 0:
            raise ValueError(f"Product id {product_id} not found.")


def add_product(
    engine: Engine,
    name: str,
    image: str,
    price_1kg: Optional[float],
    price_2kg: Optional[float],
    price_5kg: Optional[float],
    quantity: int,
    category_id: Optional[int],
    description: Optional[str] = None,
    bestseller: bool = False,
) -> int:
    if quantity < 0:
        raise ValueError("Quantity cannot be negative.")

    p1 = float(price_1kg) if price_1kg is not None else None
    p2 = float(price_2kg) if price_2kg is not None else None
    p5 = float(price_5kg) if price_5kg is not None else None

    if p2 is None:
        if p1 is not None:
            p2 = p1 * 2.0
        elif p5 is not None:
            p2 = p5 * (2.0 / 5.0)

    if p2 is None:
        raise ValueError("At least one valid weight price is required.")

    if p1 is None:
        if p2 is not None:
            p1 = p2 / 2.0
        elif p5 is not None:
            p1 = p5 / 5.0
    if p5 is None:
        if p1 is not None:
            p5 = p1 * 5.0
        elif p2 is not None:
            p5 = p2 * (5.0 / 2.0)

    p1 = round(float(p1), 2)
    p2 = round(float(p2), 2)
    p5 = round(float(p5), 2)

    if p1 <= 0 or p2 <= 0 or p5 <= 0:
        raise ValueError("Prices must be greater than zero.")

    sql = text(
        f"""
        INSERT INTO {_qname('prices')}
            (product_name, description, image, category_id, price_1kg, price_2kg, price_5kg, stock_qty, bestseller)
        VALUES
            (:name, :description, :image, :category_id, :p1, :p2, :p5, :stock_qty, :bestseller)
        RETURNING product_id
        """
    )
    with engine.begin() as conn:
        row = conn.execute(
            sql,
            {
                "name": name.strip(),
                "description": (description or "").strip() or None,
                "image": image.strip(),
                "category_id": category_id,
                "p1": p1,
                "p2": p2,
                "p5": p5,
                "stock_qty": int(quantity),
                "bestseller": bool(bestseller),
            },
        ).fetchone()
    return int(row[0])


def delete_product(engine: Engine, product_id: int) -> None:
    sql = text(f"DELETE FROM {_qname('prices')} WHERE product_id = :id")
    with engine.begin() as conn:
        res = conn.execute(sql, {"id": int(product_id)})
        if res.rowcount == 0:
            raise ValueError(f"Product id {product_id} not found.")

