"use client";

import { useState, useEffect } from "react";
import { useRazorpay } from "../hooks/useRazorpay";
// Payment gateway removed
import { useRouter } from "next/navigation";
import { useCart } from "@/src/context/CartContext";
import "./CheckoutPage.css";
import {
  FaPhone,
  FaUser,
} from "react-icons/fa";
import config from "@/src/data/config.json";
import {
  calculateCouponDiscount,
  loadDiscountConfig,
  type CouponRule,
  type DiscountConfig,
} from "@/src/utils/discountConfig";
import {
  getDefaultShippingConfig,
  normalizeShippingConfig,
  SHIPPING_CONFIG_UPDATED_EVENT,
  type ShippingConfig,
} from "@/src/utils/shippingConfig";

const BACKEND_PROXY_API = "/api/backend-proxy";
const SHIPPING_CONFIG_API = "/api/shipping-config";

interface OrderDetails {
  orderId?: string;
  transactionId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    name: string;
    quantity: number;
    weight: string;
    price: number;
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  timestamp: string;
}

interface CreateOrderResponse {
  order_id: number;
  status: string;
  payment_id: string;
  razorpay_key_id?: string;
}

function parseWeightToKg(weightLabel: string): number {
  if (!weightLabel) return 0;
  const value = weightLabel.toLowerCase().trim();
  const numberMatch = value.match(/\d+(?:\.\d+)?/);
  if (!numberMatch) return 0;
  const amount = Number(numberMatch[0]);
  if (Number.isNaN(amount)) return 0;

  if (value.includes("g") && !value.includes("kg")) {
    return amount / 1000;
  }
  return amount;
}

function getDeliveryRate(
  shippingConfig: ShippingConfig,
  zone: string,
  totalWeightKg: number
): number {
  const rows = shippingConfig.slabs || [];
  const matched = rows.find((row) => {
    const minOk = totalWeightKg >= row.minKg;
    const maxOk = row.maxKg == null ? true : totalWeightKg <= row.maxKg;
    return minOk && maxOk;
  });

  if (!matched) {
    return config.delivery.deliveryFee;
  }

  const rate = matched.rates?.[zone];
  return typeof rate === "number" ? rate : config.delivery.deliveryFee;
}

const ORDERS_STORAGE_KEY = "orders";

function readStoredOrders(): OrderDetails[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((order): order is OrderDetails => !!order && typeof order === "object")
      : [];
  } catch (error) {
    console.error("Failed to parse stored orders:", error);
    return [];
  }
}

function writeStoredOrders(orders: OrderDetails[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error("Failed to store order locally:", error);
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const defaultShippingConfig = getDefaultShippingConfig();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    state: defaultShippingConfig.zones[0] || "AP",
    houseNumber: "",
    city: "",
    pincode: "",
    landmark: "",
    phone: "",
    refundConsent: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAwaitingRazorpayApproval, setIsAwaitingRazorpayApproval] = useState(false);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);
  const [isNavigatingToSuccess, setIsNavigatingToSuccess] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig>(() => loadDiscountConfig());
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(() => defaultShippingConfig);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRule | null>(null);
  const [couponMessage, setCouponMessage] = useState("");

  useEffect(() => {
    if (items.length === 0 && !isLoading && !isPaymentCompleted && !isNavigatingToSuccess) {
      router.push("/cart");
    }
  }, [items, router, isLoading, isPaymentCompleted, isNavigatingToSuccess]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const inApp =
      ua.includes("instagram") ||
      ua.includes("fbav") ||
      ua.includes("fban") ||
      ua.includes("fb_iab") ||
      ua.includes("messenger");
    setIsInAppBrowser(inApp);
  }, []);

  const openInExternalBrowser = () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const currentUrl = window.location.href;
    const isAndroid = /android/i.test(navigator.userAgent);

    if (isAndroid) {
      const withoutScheme = currentUrl.replace(/^https?:\/\//i, "");
      window.location.href = `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }

    window.open(currentUrl, "_blank", "noopener,noreferrer");
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalWeightKg = items.reduce((sum, item) => {
    return sum + parseWeightToKg(item.weight) * item.quantity;
  }, 0);
  const deliveryFee = getDeliveryRate(shippingConfig, formData.state, totalWeightKg);
  const discountAmount = appliedCoupon ? calculateCouponDiscount(subtotal, appliedCoupon) : 0;
  const total = subtotal + deliveryFee - discountAmount;
  const isPlaceOrderDisabled = isLoading || isAwaitingRazorpayApproval;

  const shippingZones = shippingConfig.zones.length > 0
    ? shippingConfig.zones
    : defaultShippingConfig.zones;

  useEffect(() => {
    const syncDiscountConfig = () => {
      setDiscountConfig(loadDiscountConfig());
    };

    syncDiscountConfig();
    window.addEventListener("discount-config-updated", syncDiscountConfig);
    window.addEventListener("storage", syncDiscountConfig);

    return () => {
      window.removeEventListener("discount-config-updated", syncDiscountConfig);
      window.removeEventListener("storage", syncDiscountConfig);
    };
  }, []);

  useEffect(() => {
    const syncShippingConfig = async () => {
      try {
        const response = await fetch(SHIPPING_CONFIG_API, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = normalizeShippingConfig(await response.json());
        setShippingConfig(payload);
      } catch {
        // Fall back to the bundled shipping config if runtime config is unavailable.
      }
    };

    const handleShippingConfigUpdated = () => {
      void syncShippingConfig();
    };

    void syncShippingConfig();
    window.addEventListener(SHIPPING_CONFIG_UPDATED_EVENT, handleShippingConfigUpdated);
    window.addEventListener("focus", handleShippingConfigUpdated);

    return () => {
      window.removeEventListener(SHIPPING_CONFIG_UPDATED_EVENT, handleShippingConfigUpdated);
      window.removeEventListener("focus", handleShippingConfigUpdated);
    };
  }, []);

  useEffect(() => {
    if (shippingZones.length === 0 || shippingZones.includes(formData.state)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      state: shippingZones[0],
    }));
  }, [formData.state, shippingZones]);

  const handleApplyCoupon = () => {
    const entered = couponInput.trim().toUpperCase();
    if (!entered) {
      setCouponMessage("Enter coupon code.");
      setAppliedCoupon(null);
      return;
    }

    const found = (discountConfig.coupons || []).find(
      (coupon) => coupon.code?.trim().toUpperCase() === entered && coupon.active !== false
    );

    if (!found) {
      setCouponMessage("Invalid or inactive coupon code.");
      setAppliedCoupon(null);
      return;
    }

    const discount = calculateCouponDiscount(subtotal, found);
    if (discount <= 0) {
      if (found.minSubtotal && subtotal < found.minSubtotal) {
        setCouponMessage(`Minimum order for this coupon is ₹${found.minSubtotal}.`);
      } else {
        setCouponMessage("Coupon is not applicable for this cart.");
      }
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(found);
    setCouponMessage(`Coupon ${found.code.toUpperCase()} applied. You saved ₹${discount.toFixed(0)}.`);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };



  const { openRazorpay } = useRazorpay(total, formData.name, formData.phone);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.pincode) {
      alert("Please fill in all required fields");
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.phone)) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!/^[0-9]{6}$/.test(formData.pincode)) {
      alert("Please enter a valid 6-digit pincode");
      return;
    }

    if (isInAppBrowser) {
      alert("Please open this page in Chrome/Safari to complete payment.");
      openInExternalBrowser();
      return;
    }

    setIsLoading(true);
    try {
      for (const item of items) {
        if (typeof item.product_id !== 'number' || isNaN(item.product_id)) {
          alert(`Invalid or missing product_id for item: ${item.name}`);
          setIsLoading(false);
          return;
        }
      }
      const orderPayload = {
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        address: `${formData.houseNumber ? `H.No: ${formData.houseNumber}, ` : ""}${formData.city ? `${formData.city}, ` : ""}${formData.pincode ? `Pincode: ${formData.pincode}` : ""}${formData.landmark ? `, Landmark: ${formData.landmark}` : ""}`,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.quantity,
          weight: item.weight,
          price: item.price,
        })),
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        coupon_code: appliedCoupon?.code || null,
        refund_consent: formData.refundConsent,
      };

      orderPayload.address = `${formData.houseNumber ? `H.No: ${formData.houseNumber}, ` : ""}${formData.city ? `${formData.city}, ` : ""}${formData.state ? `State: ${formData.state}, ` : ""}${formData.pincode ? `Pincode: ${formData.pincode}` : ""}${formData.landmark ? `, Landmark: ${formData.landmark}` : ""}`;
      const orderRes = await fetch(`${BACKEND_PROXY_API}?path=${encodeURIComponent("/orders/")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      if (!orderRes.ok) {
        const errorData = await orderRes.json().catch(() => ({}));
        throw new Error(errorData?.detail || "Failed to create order");
      }
      const orderData: CreateOrderResponse = await orderRes.json();
      if (!orderData.payment_id) {
        throw new Error("Payment order creation failed. Please try again.");
      }
      const orderDetails: OrderDetails = {
        orderId: String(orderData.order_id),
        customerName: formData.name,
        customerPhone: formData.phone,
        customerAddress: orderPayload.address,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          weight: item.weight,
          price: item.price,
        })),
        subtotal,
        deliveryFee,
        total,
        timestamp: new Date().toISOString(),
      };

      // Open Razorpay payment modal
      setIsAwaitingRazorpayApproval(true);
      openRazorpay(orderData.payment_id, orderData.razorpay_key_id, async (response) => {
        try {
          const verifyRes = await fetch(`${BACKEND_PROXY_API}?path=${encodeURIComponent("/payments/verify")}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: orderData.order_id,
              razorpay_order_id: response.razorpay_order_id || orderData.payment_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "",
            }),
          });

          if (!verifyRes.ok) {
            const verifyError = await verifyRes.json().catch(() => ({}));
            throw new Error(verifyError?.detail || "Payment verification failed.");
          }

          orderDetails.transactionId = response.razorpay_payment_id;
          const existingOrders = readStoredOrders();
          writeStoredOrders([...existingOrders, orderDetails]);
          setIsNavigatingToSuccess(true);
          setIsPaymentCompleted(true);
          clearCart();
          window.location.replace("/order-success");
        } catch (verifyErr) {
          const verifyMessage =
            verifyErr instanceof Error ? verifyErr.message : "Payment verification failed.";
          alert(`${verifyMessage} Please contact support with your payment reference.`);
          setIsAwaitingRazorpayApproval(false);
        }
      }, (failureMessage) => {
        alert(failureMessage);
        setIsAwaitingRazorpayApproval(false);
      });
    } catch (error) {
      let message = "Order placement failed. Please contact support.";
      if (error instanceof Error) {
        if (error.message === "Failed to fetch") {
          message = "Unable to reach backend API via proxy. This usually means backend is down, proxy config is wrong, or network/database is overloaded.";
        } else {
          message = error.message;
        }
      }
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0 && !isLoading) {
    return (
      <div className="checkout-loading">
        <p>Redirecting to cart...</p>
      </div>
    );
  }

  if (isInAppBrowser) {
    return (
      <div className="checkout-container">
        <div className="checkout-wrapper" style={{ maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              background: "#fff4e5",
              border: "1px solid #ffd8a8",
              borderRadius: 10,
              padding: 16,
              color: "#7a4d00",
              marginTop: 20,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Open in Browser Required</h2>
            <p style={{ marginBottom: 12 }}>
              For successful Razorpay/UPI payment, please open checkout in Chrome/Safari.
              Instagram/Facebook in-app browser may fail.
            </p>
            <button
              type="button"
              onClick={openInExternalBrowser}
              style={{
                border: "none",
                background: "#8b5a3c",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Open in Chrome/Safari
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        {/* Checkout Form Section */}
        <div className="checkout-form-section">
          <h1>Checkout</h1>

          <form onSubmit={handleCheckout}>
            {/* Customer Name */}
            <div className="form-group">
              <label htmlFor="name">
                <FaUser style={{ marginRight: "8px" }} />
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Customer Email */}
            <div className="form-group">
              <label htmlFor="email">Email (Optional)</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            {/* House Number */}
            <div className="form-group">
              <label htmlFor="houseNumber">H.No</label>
              <input
                type="text"
                id="houseNumber"
                name="houseNumber"
                placeholder="Enter house number"
                value={formData.houseNumber}
                onChange={handleInputChange}
              />
            </div>

            {/* City */}
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                placeholder="Enter city"
                value={formData.city}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="state">State / Delivery Zone *</label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, state: event.target.value }))
                }
                required
              >
                {shippingZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>

            {/* Pincode */}
            <div className="form-group">
              <label htmlFor="pincode">Pincode *</label>
              <input
                type="text"
                inputMode="numeric"
                id="pincode"
                name="pincode"
                placeholder="Enter pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                pattern="[0-9]{6}"
                required
              />
            </div>

            {/* Landmark */}
            <div className="form-group">
              <label htmlFor="landmark">Landmark</label>
              <input
                type="text"
                id="landmark"
                name="landmark"
                placeholder="Enter landmark"
                value={formData.landmark}
                onChange={handleInputChange}
              />
            </div>


            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="phone">
                <FaPhone style={{ marginRight: "8px" }} />
                Mob Number *
              </label>
              <input
                type="tel"
                inputMode="numeric"
                id="phone"
                name="phone"
                placeholder="Enter your mobile number"
                value={formData.phone}
                onChange={handleInputChange}
                pattern="[0-9]{10}"
                required
              />
            </div>

            {/* Refund Policy Consent Checkbox */}
            <div className="form-group" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  name="refundConsent"
                  checked={formData.refundConsent || false}
                  onChange={e => setFormData(prev => ({ ...prev, refundConsent: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                  required
                />
                <span style={{ fontWeight: 500, fontSize: 16 }}>
                  I agree to the
                  <a href="/terms" target="_blank" style={{ color: '#8b5a3c', marginLeft: 6, textDecoration: 'underline', fontWeight: 600 }}>Refund Policy</a>
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <div
              title={
                isPlaceOrderDisabled
                  ? "Place Order button is disabled until Razorpay approval."
                  : undefined
              }
            >
              <button
                type="submit"
                className="checkout-btn"
                disabled={isPlaceOrderDisabled}
              >
                {isLoading || isAwaitingRazorpayApproval ? "Processing..." : "Place Order"}
              </button>
            </div>
          </form>
        </div>

        {/* Order Summary Section */}
        <div className="order-summary-section">
          <h2>Order Summary</h2>

          <div className="cart-items">
            {items.map((item) => (
              <div key={item.id} className="cart-item-summary">
                <div className="item-details">
                  <h4>{item.name}</h4>
                  <p className="weight-qty">
                    {item.weight} × {item.quantity}
                  </p>
                </div>
                <div className="item-price">
                  ₹{item.price * item.quantity}
                </div>
              </div>
            ))}
          </div>

          <div className="summary-divider"></div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>

          <div className="summary-row">
            <span>Delivery Fee</span>
            <span>₹{deliveryFee}</span>
          </div>

          <div className="coupon-row">
            <input
              type="text"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
              placeholder="Enter coupon code"
            />
            <button type="button" onClick={handleApplyCoupon}>
              Apply
            </button>
          </div>

          {couponMessage ? <p className="coupon-message">{couponMessage}</p> : null}

          {discountAmount > 0 ? (
            <div className="summary-row discount-row">
              <span>Discount</span>
              <span>-₹{discountAmount.toFixed(0)}</span>
            </div>
          ) : null}

          <div className="summary-divider"></div>

          <div className="summary-total">
            <span>Total Amount</span>
            <span>₹{total}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
