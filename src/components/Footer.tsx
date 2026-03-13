import Link from "next/link";
import "./Footer.css";
import config from "@/src/data/config.json";

export default function Footer() {
  const business = config.businessInfo;
  const delivery = config.delivery;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h3>{business.name || "Ulavapadu Mangoes"}</h3>
          <p>{business.tagline || "Fresh mangoes and products"}</p>
          <p>Serving fresh orders in {delivery.deliveryArea || business.address || "your area"}</p>

          <div className="footer-highlights">
            <span>Farm-direct seasonal stock</span>
            <span>Secure online payments</span>
            <span>Fresh dispatch every day</span>
          </div>
        </div>

        <div className="footer-links">
          <h4>Explore</h4>
          <Link href="/">Home</Link>
          <Link href="/products">Menu</Link>
          <Link href="/track">Track Order</Link>
          <Link href="/cart">Cart</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/checkout">Checkout</Link>
          <Link href="/admin">Admin</Link>
        </div>

        <div className="footer-contact">
          <h4>Order & Support</h4>
          <p>
            <strong>Phone:</strong>
            <span>{business.phone || "-"}</span>
          </p>
          <p>
            <strong>Alternate:</strong>
            <span>{business.alternatePhone || "-"}</span>
          </p>
          <p>
            <strong>Email:</strong>
            <span>{business.email || "-"}</span>
          </p>
          <p>
            <strong>Address:</strong>
            <span>{business.address || "-"}</span>
          </p>
          <p>
            <strong>WhatsApp:</strong>
            <a href={`https://wa.me/${business.whatsappNumber || ""}`} target="_blank" rel="noreferrer">
              Chat on WhatsApp
            </a>
          </p>
          <p>
            <strong>Maps:</strong>
            <a href={business.googleMapsUrl || "#"} target="_blank" rel="noreferrer">
              Open location
            </a>
          </p>
          <p>
            <strong>Instagram:</strong>
            <a href={business.instagram || "#"} target="_blank" rel="noreferrer">
              {business.instagramHandle || "Open page"}
            </a>
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        Copyright 2026 {business.name || "Ulavapadu Mangoes"} - Built for online ordering
      </div>
    </footer>
  );
}
