import time
from typing import Callable, Optional, Tuple, TypeVar

from app.services.config_service import get_razorpay_creds

try:
    import razorpay
except ImportError:
    razorpay = None


T = TypeVar("T")


def _load_credentials() -> Tuple[Optional[str], Optional[str]]:
    creds = get_razorpay_creds()
    key_id = creds.get("key_id")
    key_secret = creds.get("key_secret")
    return key_id, key_secret


RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET = _load_credentials()

if razorpay is None:
    print("[DEBUG] Razorpay package not installed.")
    client = None
elif not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    print("[DEBUG] Razorpay credentials are missing in backend-code/creds/razorpay_creds.json.")
    client = None
else:
    try:
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        print("[DEBUG] Razorpay client initialized successfully.")
    except Exception as exc:
        print(f"[DEBUG] Razorpay client initialization failed: {exc}")
        client = None


def get_public_key_id() -> Optional[str]:
    return RAZORPAY_KEY_ID


def _run_with_retries(operation: Callable[[], T], *, max_attempts: int = 3, delay_seconds: float = 0.6) -> T:
    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return operation()
        except Exception as exc:
            last_error = exc
            if attempt >= max_attempts:
                break
            time.sleep(delay_seconds)

    raise RuntimeError(f"Razorpay request failed after {max_attempts} attempts: {last_error}")


def create_payment(total_amount: float):
    if client is None:
        raise RuntimeError("Razorpay integration is disabled or credentials are missing.")

    amount_paise = int(total_amount * 100)
    if amount_paise <= 0:
        raise ValueError("Invalid total amount for payment creation.")

    return _run_with_retries(
        lambda: client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": 1,
            }
        )
    )


def verify_payment_signature(
    razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str
) -> bool:
    if client is None:
        raise RuntimeError("Razorpay integration is disabled or credentials are missing.")

    client.utility.verify_payment_signature(
        {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        }
    )
    return True


def fetch_payment(razorpay_payment_id: str):
    if client is None:
        raise RuntimeError("Razorpay integration is disabled or credentials are missing.")

    return _run_with_retries(lambda: client.payment.fetch(razorpay_payment_id))
