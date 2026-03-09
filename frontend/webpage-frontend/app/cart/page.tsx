"use client";

import { useCart } from "@/src/context/CartContext";
import Link from "next/link";
import "./CartPage.css";
import { FaTrash, FaMinus, FaPlus } from "react-icons/fa";
import config from "@/src/data/config.json";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalPrice } =
    useCart();

  const subtotal = getTotalPrice();
  const deliveryFee = subtotal >= config.delivery.freeDeliveryThreshold ? 0 : config.delivery.deliveryFee;
  const total = subtotal + deliveryFee;

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
                  <div className="item-image">
                    <img src={item.image} alt={item.name} />
                  </div>

                  <div className="item-details">
                    <h3>{item.name}</h3>
                    <p className="item-weight">{item.weight}</p>
                    <p className="item-category">{item.category}</p>
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

            {subtotal < config.delivery.freeDeliveryThreshold && (
              <div className="summary-item warning">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee}</span>
              </div>
            )}

            {subtotal >= config.delivery.freeDeliveryThreshold && (
              <div className="summary-item success">
                <span>Delivery Fee</span>
                <span className="free">FREE</span>
              </div>
            )}

            {subtotal < config.delivery.freeDeliveryThreshold && (
              <div className="delivery-message">
                Add ₹{config.delivery.freeDeliveryThreshold - subtotal} more for free delivery!
              </div>
            )}

            <div className="summary-divider"></div>

            <div className="summary-total">
              <span>Total Amount</span>
              <span>₹{total}</span>
            </div>

            <Link href="/checkout" className="checkout-btn">
              Proceed to Checkout
            </Link>

            <Link href="/products" className="continue-shopping">
              ← Continue Shopping
            </Link>

            <div className="delivery-info">
              <h4>Free Delivery</h4>
              <p>On orders above ₹{config.delivery.freeDeliveryThreshold}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
