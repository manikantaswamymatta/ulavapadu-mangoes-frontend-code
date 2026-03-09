from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Order, Payment
from app.schemas import PaymentVerifyRequest, PaymentVerifyResponse
from app.services import razorpay_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/verify", response_model=PaymentVerifyResponse)
def verify_payment(payload: PaymentVerifyRequest, db: Session = Depends(get_db)):
    try:
        db_order = db.query(Order).filter(Order.id == payload.order_id).first()
        if not db_order:
            raise HTTPException(status_code=404, detail="Order not found")

        created_payment = (
            db.query(Payment)
            .filter(
                Payment.order_id == payload.order_id,
                Payment.payment_id == payload.razorpay_order_id,
            )
            .first()
        )
        if not created_payment:
            raise HTTPException(status_code=400, detail="Payment order does not match this order")
    except OperationalError:
        db.rollback()
        raise HTTPException(status_code=503, detail="Database is busy. Please try again shortly.")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    # Primary verification path: signature check.
    is_verified = False
    signature_value = (payload.razorpay_signature or "").strip()
    if signature_value:
        try:
            razorpay_service.verify_payment_signature(
                razorpay_order_id=payload.razorpay_order_id,
                razorpay_payment_id=payload.razorpay_payment_id,
                razorpay_signature=signature_value,
            )
            is_verified = True
        except Exception:
            is_verified = False

    # Secondary verification fallback via Razorpay payment fetch.
    payment_data = None
    if not is_verified:
        try:
            payment_data = razorpay_service.fetch_payment(payload.razorpay_payment_id)
            fetched_order_id = payment_data.get("order_id")
            fetched_status = (payment_data.get("status") or "").lower()
            if fetched_order_id != payload.razorpay_order_id:
                raise HTTPException(status_code=400, detail="Payment order id mismatch.")
            if fetched_status in {"failed", "cancelled"}:
                raise HTTPException(status_code=400, detail="Payment is not successful.")
            is_verified = True
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Payment verification failed: {exc}")
    else:
        try:
            payment_data = razorpay_service.fetch_payment(payload.razorpay_payment_id)
        except Exception:
            payment_data = None

    try:
        amount_rupees = None
        currency = "INR"
        if payment_data:
            amount_paise = payment_data.get("amount")
            if amount_paise is not None:
                try:
                    amount_rupees = float(amount_paise) / 100.0
                except (TypeError, ValueError):
                    amount_rupees = None
            currency = payment_data.get("currency") or "INR"

        created_payment.status = "verified" if is_verified else "verification_failed"
        created_payment.gateway_order_id = payload.razorpay_order_id
        created_payment.transaction_id = payload.razorpay_payment_id
        if amount_rupees is not None:
            created_payment.amount = amount_rupees
        elif created_payment.amount is None:
            created_payment.amount = db_order.total_amount
        created_payment.currency = currency

        captured_payment = (
            db.query(Payment)
            .filter(Payment.payment_id == payload.razorpay_payment_id)
            .first()
        )
        if captured_payment:
            captured_payment.status = "captured"
            captured_payment.order_id = payload.order_id
            captured_payment.gateway_order_id = payload.razorpay_order_id
            captured_payment.transaction_id = payload.razorpay_payment_id
            if amount_rupees is not None:
                captured_payment.amount = amount_rupees
            elif captured_payment.amount is None:
                captured_payment.amount = db_order.total_amount
            captured_payment.currency = currency
        else:
            captured_payment = Payment(
                payment_id=payload.razorpay_payment_id,
                order_id=payload.order_id,
                gateway_order_id=payload.razorpay_order_id,
                transaction_id=payload.razorpay_payment_id,
                amount=amount_rupees if amount_rupees is not None else db_order.total_amount,
                currency=currency,
                status="captured",
            )
            db.add(captured_payment)

        if db_order.total_amount is None:
            db_order.total_amount = amount_rupees if amount_rupees is not None else 0
        db_order.status = "paid"
        db.commit()
    except OperationalError:
        db.rollback()
        raise HTTPException(status_code=503, detail="Database is busy. Please try again shortly.")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to store payment verification: {exc}")

    return PaymentVerifyResponse(
        success=True,
        order_id=payload.order_id,
        order_status=db_order.status,
        payment_id=payload.razorpay_payment_id,
    )
