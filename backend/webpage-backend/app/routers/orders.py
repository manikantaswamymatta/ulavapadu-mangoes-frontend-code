import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Order, Payment
from app.schemas import OrderCreate, OrderResponse
from app.services import razorpay_service

router = APIRouter(prefix="/orders", tags=["Orders"])


def _pick_best_payment_id(payments: list[Payment]) -> str | None:
    # Prefer captured transaction id for user-visible order tracking.
    for p in payments:
        if p.status == "captured" and p.transaction_id:
            return p.transaction_id
    for p in payments:
        if p.status == "captured":
            return p.payment_id
    for p in payments:
        if p.status in {"created", "verified"}:
            return p.payment_id
    return payments[0].payment_id if payments else None


def _serialize_items(raw_items: str) -> list:
    if not raw_items:
        return []
    try:
        return json.loads(raw_items)
    except json.JSONDecodeError:
        return []


@router.get("/by-phone/{phone}", response_model=List[OrderResponse])
def get_orders_by_phone(phone: str, db: Session = Depends(get_db)):
    try:
        db_orders = (
            db.query(Order)
            .filter(Order.customer_phone == phone)
            .order_by(Order.created_at.desc())
            .all()
        )

        if not db_orders:
            return []

        order_ids = [o.id for o in db_orders]
        payments = (
            db.query(Payment)
            .filter(Payment.order_id.in_(order_ids))
            .all()
        )
        payments_by_order: dict[int, list[Payment]] = {}
        for p in payments:
            if p.order_id is None:
                continue
            payments_by_order.setdefault(p.order_id, []).append(p)

        result = []
        for db_order in db_orders:
            result.append(
                OrderResponse(
                    order_id=db_order.id,
                    status=db_order.status,
                    payment_id=_pick_best_payment_id(payments_by_order.get(db_order.id, [])),
                    razorpay_key_id=None,
                    items=_serialize_items(db_order.items),
                    customer_name=db_order.customer_name,
                    customer_email=db_order.customer_email,
                    customer_phone=db_order.customer_phone,
                    address=db_order.address,
                    booking_date=db_order.created_at.isoformat() if db_order.created_at else None,
                )
            )
        return result
    except OperationalError:
        db.rollback()
        raise HTTPException(status_code=503, detail="Database is busy. Please try again shortly.")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")


@router.post("/", response_model=OrderResponse)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    items_as_dicts = [item.dict() if hasattr(item, "dict") else dict(item) for item in order.items]
    items_subtotal = sum(item.price * item.quantity for item in order.items)
    delivery_fee = float(order.delivery_fee or 0)
    total_amount = items_subtotal + delivery_fee

    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Order total must be greater than zero.")

    try:
        db_order = Order(
            customer_name=order.customer_name,
            customer_email=order.customer_email,
            customer_phone=order.customer_phone,
            address=order.address,
            status="created",
            items=json.dumps(items_as_dicts),
            delivery_fee=delivery_fee,
            total_amount=total_amount,
        )
        db.add(db_order)
        db.flush()  # Allocate DB order id before Razorpay order creation.

        payment = razorpay_service.create_payment(total_amount)
        payment_id = payment.get("id")
        if not payment_id:
            raise RuntimeError("Razorpay did not return a payment order id.")

        db_payment = Payment(
            payment_id=payment_id,
            order_id=db_order.id,
            gateway_order_id=payment_id,
            transaction_id=None,
            amount=total_amount,
            currency="INR",
            status="created",
        )
        db.add(db_payment)
        db_order.status = "payment_initiated"

        db.commit()
        db.refresh(db_order)
    except OperationalError:
        db.rollback()
        raise HTTPException(status_code=503, detail="Database is busy. Please try again shortly.")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error while creating order: {exc}")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Order initialization failed: {exc}")

    return OrderResponse(
        order_id=db_order.id,
        status=db_order.status,
        payment_id=payment_id,
        razorpay_key_id=razorpay_service.get_public_key_id(),
        items=items_as_dicts,
        customer_name=db_order.customer_name,
        customer_email=db_order.customer_email,
        customer_phone=db_order.customer_phone,
        address=db_order.address,
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    try:
        db_order = db.query(Order).filter(Order.id == order_id).first()
        if not db_order:
            raise HTTPException(status_code=404, detail="Order not found")

        payment = (
            db.query(Payment)
            .filter(Payment.order_id == db_order.id)
            .all()
        )
        best_payment_id = _pick_best_payment_id(payment)

        return OrderResponse(
            order_id=db_order.id,
            status=db_order.status,
            payment_id=best_payment_id,
            razorpay_key_id=razorpay_service.get_public_key_id(),
            items=_serialize_items(db_order.items),
            customer_name=db_order.customer_name,
            customer_email=db_order.customer_email,
            customer_phone=db_order.customer_phone,
            address=db_order.address,
            booking_date=db_order.created_at.isoformat() if db_order.created_at else None,
        )
    except OperationalError:
        db.rollback()
        raise HTTPException(status_code=503, detail="Database is busy. Please try again shortly.")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
