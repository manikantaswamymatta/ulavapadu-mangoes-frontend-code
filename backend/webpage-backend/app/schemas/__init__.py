
from pydantic import BaseModel
from typing import List, Optional

class OrderItemCreate(BaseModel):
	product_id: int
	product_name: str
	quantity: int
	weight: str
	price: float

class OrderCreate(BaseModel):
	customer_name: Optional[str]
	customer_email: Optional[str]
	customer_phone: Optional[str]
	address: str
	items: List[OrderItemCreate]
	delivery_fee: Optional[float] = 0
	refund_consent: Optional[bool] = False

class OrderItemResponse(BaseModel):
	product_id: int
	product_name: str
	quantity: int
	weight: str
	price: float

class OrderResponse(BaseModel):
	order_id: int
	status: str
	payment_id: Optional[str]
	razorpay_key_id: Optional[str] = None
	items: List[OrderItemResponse]
	customer_name: Optional[str]
	customer_email: Optional[str]
	customer_phone: Optional[str]
	address: str
	booking_date: Optional[str] = None

# Schemas for pricing endpoints
from typing import Any

class PriceUpdate(BaseModel):
	 item_id: int
	 new_price: float

class PriceResponse(BaseModel):
	 item_id: int
	 price: float

# Schemas for payments endpoints
class PaymentCreate(BaseModel):
	payment_id: str
	order_id: int
	status: str

class PaymentResponse(BaseModel):
	payment_id: str
	status: str


class PaymentVerifyRequest(BaseModel):
	order_id: int
	razorpay_order_id: str
	razorpay_payment_id: str
	razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
	success: bool
	order_id: int
	order_status: str
	payment_id: str
