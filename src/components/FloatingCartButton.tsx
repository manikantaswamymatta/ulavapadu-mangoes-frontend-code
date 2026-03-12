"use client";

import Link from "next/link";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "@/src/context/CartContext";
import "./FloatingCartButton.css";

export default function FloatingCartButton() {
  const { getTotalItems } = useCart();
  const count = getTotalItems();

  return (
    <Link href="/cart" className="floating-cart-btn" aria-label="Open cart">
      <FaShoppingCart />
      {count > 0 && <span className="floating-cart-badge">{count}</span>}
    </Link>
  );
}
