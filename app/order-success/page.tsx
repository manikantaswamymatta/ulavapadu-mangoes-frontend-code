"use client";

import html2canvas from "html2canvas";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./OrderSuccess.css";
import config from "@/src/data/config.json";

interface OrderItemSummary {
  name: string;
  quantity: number;
  weight: string;
  price: number;
}

interface OrderDetails {
  orderId?: string;
  transactionId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItemSummary[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  timestamp: string;
}

const ORDERS_STORAGE_KEY = "orders";

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeOrder(raw: unknown): OrderDetails | null {
  if (!raw || typeof raw !== "object") return null;

  const value = raw as Record<string, unknown>;
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "Item",
      quantity: toNumber(item.quantity),
      weight: typeof item.weight === "string" ? item.weight : "",
      price: toNumber(item.price),
    }));

  return {
    orderId:
      typeof value.orderId === "string" || typeof value.orderId === "number"
        ? String(value.orderId)
        : undefined,
    transactionId: typeof value.transactionId === "string" ? value.transactionId : undefined,
    customerName: typeof value.customerName === "string" ? value.customerName : "",
    customerPhone: typeof value.customerPhone === "string" ? value.customerPhone : "",
    customerAddress: typeof value.customerAddress === "string" ? value.customerAddress : "",
    items,
    subtotal: toNumber(value.subtotal),
    deliveryFee: toNumber(value.deliveryFee),
    total: toNumber(value.total),
    timestamp: typeof value.timestamp === "string" ? value.timestamp : new Date().toISOString(),
  };
}

function getLastOrderFromStorage(): OrderDetails | null {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return normalizeOrder(parsed[parsed.length - 1]);
  } catch {
    return null;
  }
}

export default function OrderSuccessPage() {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderDetails | null>(null);

  useEffect(() => {
    setLastOrder(getLastOrderFromStorage());
  }, []);

  const handleDownloadAsImage = async () => {
    if (!receiptRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imageUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `order-${lastOrder?.orderId || "receipt"}.png`;
      link.click();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="z-success-container">
      <div className="z-success-content" ref={receiptRef}>
        <div className="z-success-icon">OK</div>
        <h1>Order confirmed</h1>
        <p className="z-success-message">
          Your payment is verified and your order is successfully placed.
        </p>

        {lastOrder && (
          <div className="z-order-details-card">
            <h3>Order details</h3>
            <div className="z-detail-item">
              <span className="z-detail-label">Order Amount:</span>
              <span className="z-detail-value">Rs {lastOrder.total ?? "N/A"}</span>
            </div>
            <div className="z-detail-item">
              <span className="z-detail-label">Transaction ID:</span>
              <span className="z-detail-value">{lastOrder.transactionId ?? "N/A"}</span>
            </div>
            <div className="z-detail-item">
              <span className="z-detail-label">Customer:</span>
              <span className="z-detail-value">{lastOrder.customerName ?? "N/A"}</span>
            </div>
            <div className="z-detail-item">
              <span className="z-detail-label">Phone:</span>
              <span className="z-detail-value">{lastOrder.customerPhone ?? "N/A"}</span>
            </div>
            <div className="z-detail-item">
              <span className="z-detail-label">Address:</span>
              <span className="z-detail-value">{lastOrder.customerAddress ?? "N/A"}</span>
            </div>
            <div className="z-detail-item">
              <span className="z-detail-label">Subtotal:</span>
              <span className="z-detail-value">Rs {lastOrder.subtotal ?? "N/A"}</span>
            </div>
            <div className="z-detail-item">
              <span className="z-detail-label">Delivery Fee:</span>
              <span className="z-detail-value">Rs {lastOrder.deliveryFee ?? "N/A"}</span>
            </div>
            <div className="z-detail-item">
              <span className="z-detail-label">Items:</span>
              <span className="z-detail-value">
                {Array.isArray(lastOrder.items) && lastOrder.items.length > 0
                  ? lastOrder.items.map((i) => `${i.name} (${i.weight}) x${i.quantity}`).join(", ")
                  : "N/A"}
              </span>
            </div>
          </div>
        )}

        <div className="z-order-info">
          <div className="z-info-item">
            <span className="z-label">What happens next?</span>
            <ul className="z-info-list">
              <li>Your order will be prepared shortly</li>
              <li>Track your delivery via updates</li>
              <li>Free delivery for orders above Rs {config.delivery.freeDeliveryThreshold}</li>
            </ul>
          </div>

          <div className="z-info-item">
            <span className="z-label">Need help?</span>
            <p className="z-help-text">Contact us for any query about your order.</p>
          </div>
        </div>

        <div className="z-action-buttons">
          <button className="z-btn z-btn-primary" onClick={handleDownloadAsImage} disabled={isDownloading}>
            {isDownloading ? "Preparing image..." : "Download receipt"}
          </button>
          <Link href="/" className="z-btn z-btn-primary">Back to home</Link>
          <Link href="/products" className="z-btn z-btn-secondary">Continue shopping</Link>
        </div>

        <div className="z-thank-you">
          <p>Thank you for ordering from {config.businessInfo.name}.</p>
        </div>
      </div>
    </div>
  );
}
