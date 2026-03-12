import Link from "next/link";
import "./ReadyToOrder.css";

export default function ReadyToOrder() {
  return (
    <section className="cta">
      <h2>Ready to Order?</h2>
      <p>
        Place your mango order now and get farm-fresh seasonal varieties delivered with secure online payment.
      </p>

      <div className="cta-buttons">
        <Link href="/products" className="cta-btn">Browse Products & Checkout</Link>
      </div>
    </section>
  );
}
