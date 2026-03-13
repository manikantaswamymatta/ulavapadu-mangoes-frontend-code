"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/src/context/CartContext";
import Link from "next/link";
import "./CartPage.css";
import { FaTrash, FaMinus, FaPlus } from "react-icons/fa";
import config from "@/src/data/config.json";

const CART_NOTES_KEY = "ulavapadu-cart-customer-notes";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalPrice } =
    useCart();
  const [customerNotes, setCustomerNotes] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_NOTES_KEY);
      if (typeof saved === "string") {
        setCustomerNotes(saved);
      }
    } catch {
      setCustomerNotes("");
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_NOTES_KEY, customerNotes);
    } catch {
      // Ignore storage write issues.
    }
  }, [customerNotes]);

  const subtotal = getTotalPrice();

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <h1>Shopping Cart</h1>
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Start adding some delicious homemade products!</p>
            <Link href="/products" className="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <h1>Shopping Cart</h1>

        <div className="cart-content">
          {/* Cart Items */}
          <div className="cart-items-section">
            <div className="cart-header">
              <span>{items.length} items in cart</span>
              <button className="clear-cart-btn" onClick={clearCart}>
                Clear Cart
              </button>
            </div>

            <div className="cart-items">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  {(() => {
                    const stockLimit = Number(item.stock_qty ?? Number.POSITIVE_INFINITY);
                    const hasStockLimit = Number.isFinite(stockLimit);
                    const canIncrease = !hasStockLimit || item.quantity < stockLimit;
                    return (
                      <>
                  <div className="item-image">
                    <img src={item.image} alt={item.name} />
                  </div>

                  <div className="item-details">
                    <h3>{item.name}</h3>
                    <p className="item-weight">{item.weight}</p>
                    <p className="item-category">{item.category}</p>
                    {hasStockLimit ? (
                      <p className="item-category">Stock: {stockLimit <= 0 ? "Out of stock" : stockLimit}</p>
                    ) : null}
                  </div>

                  <div className="item-quantity">
                    <button
                      className="qty-btn"
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                    >
                      <FaMinus />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      disabled={!canIncrease}
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <div className="item-price">
                    <span className="price">₹{item.price * item.quantity}</span>
                    <span className="unit-price">
                      ₹{item.price}/{item.weight}
                    </span>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Remove item"
                  >
                    <FaTrash />
                  </button>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* Cart Summary */}
          <div className="cart-summary">
            <h2>Order Summary</h2>

            <div className="summary-item">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="summary-item">
              <span>Delivery Fee</span>
              <span>Calculated at checkout</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-total">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="cart-notes">
              <label htmlFor="cart-customer-notes">Customer Notes</label>
              <textarea
                id="cart-customer-notes"
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                placeholder="Any ripeness preference, delivery landmark, or handling note..."
                rows={3}
              />
            </div>

            <Link href="/checkout" className="checkout-btn">
              Proceed to Checkout
            </Link>

            <Link href="/products" className="continue-shopping">
              ← Continue Shopping
            </Link>

            <div className="delivery-info">
              <h4>Delivery Information</h4>
              <p>Delivery charges are applied by selected state and total weight at checkout.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
