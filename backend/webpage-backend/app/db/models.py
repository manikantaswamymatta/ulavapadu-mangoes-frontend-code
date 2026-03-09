from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.db import Base, DB_SCHEMA

ORDER_STATUSES = [
    "booked",
    "order confirmed",
    "order shipped",
    "order delivered"
]

class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": DB_SCHEMA}
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, index=True)
    image = Column(String, nullable=True)

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = {"schema": DB_SCHEMA}
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True, index=True)
    address = Column(String)
    status = Column(String, index=True)
    items = Column(String, nullable=True)  # JSON string of items
    delivery_fee = Column(Float, nullable=False, default=0)
    total_amount = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = {"schema": DB_SCHEMA}
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey(f"{DB_SCHEMA}.orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey(f"{DB_SCHEMA}.prices.product_id"), nullable=False)
    product_name = Column(String)
    quantity = Column(Integer)
    weight = Column(String)  # e.g., '250g', '500g', '1Kg'
    price = Column(Float)

class Price(Base):
    __tablename__ = "prices"
    __table_args__ = {"schema": DB_SCHEMA}
    product_id = Column(Integer, primary_key=True, autoincrement=True)
    product_name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    price_1kg = Column(Float, nullable=True)
    price_2kg = Column(Float, nullable=True)
    price_5kg = Column(Float, nullable=True)
    category_id = Column(Integer, ForeignKey(f"{DB_SCHEMA}.categories.id"), nullable=True, index=True)
    bestseller = Column(Boolean, default=False, index=True)
    stock_qty = Column(Integer, nullable=False, default=0)

class UserConsent(Base):
    __tablename__ = "user_consent"
    __table_args__ = {"schema": DB_SCHEMA}
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_phone = Column(String, nullable=False, index=True)
    consent_given = Column(Boolean, default=False)
    consent_timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": DB_SCHEMA}
    payment_id = Column(String, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey(f"{DB_SCHEMA}.orders.id"), nullable=True, index=True)
    gateway_order_id = Column(String, index=True, nullable=True)
    transaction_id = Column(String, index=True, nullable=True)
    amount = Column(Float, nullable=True)
    currency = Column(String, nullable=False, default="INR")
    status = Column(String, index=True)
    # Remove relationship to avoid ambiguity
