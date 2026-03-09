"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaMapMarkerAlt, FaShoppingCart, FaTruck } from "react-icons/fa";
import { GiDango } from "react-icons/gi";
import { useCart } from "@/src/context/CartContext";
import "./MobileBottomNav.css";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems();

  const tabs = [
    { href: "/", label: "Home", icon: <FaHome /> },
    { href: "/track", label: "Track", icon: <FaTruck /> },
    { href: "/contact", label: "Location", icon: <FaMapMarkerAlt /> },
    { href: "/products", label: "Order", icon: <GiDango /> },
    { href: "/cart", label: "Cart", icon: <FaShoppingCart />, badge: cartCount },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile bottom navigation">
      {tabs.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`mobile-tab ${active ? "active" : ""}`}>
            <span className="tab-icon-wrap">
              {tab.icon}
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span className="tab-badge">{tab.badge > 99 ? "99+" : tab.badge}</span>
              )}
            </span>
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
