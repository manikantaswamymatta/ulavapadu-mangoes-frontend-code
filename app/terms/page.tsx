import Footer from "@/src/components/Footer";
import config from "@/src/data/config.json";
import "./TermsPage.css";

export default function TermsPage() {
  return (
    <div className="terms-page">
      <section className="terms-hero">
        <span className="terms-pill">Legal</span>
        <h1>Terms & Conditions</h1>
        <p>
          By using the {config.businessInfo.name} website, you agree to the
          following terms and conditions. Please read them carefully.
        </p>
        <p className="terms-updated">Last updated: February 5, 2026</p>
      </section>

      <section className="terms-content">
        <div className="terms-section">
          <h2>Orders & Pricing</h2>
          <p>
            All prices are listed in INR and may change without notice.
            Availability of items can vary based on season and production.
          </p>
        </div>

        <div className="terms-section">
          <h2>Payments</h2>
          <p>
            Payments are accepted via UPI/QR or as specified at checkout. Orders
            are confirmed once payment is successfully received.
          </p>
        </div>

        <div className="terms-section">
          <h2>Delivery</h2>
          <p>
            Estimated delivery timelines depend on location and courier
            services. We are not liable for delays caused by external carriers
            or unforeseen events.
          </p>
        </div>

        <div className="terms-section">
          <h2>Cancellations & Refunds</h2>
          <p>
            Because our products are made to order, cancellations may only be
            accepted before production begins. For issues with an order, contact
            us promptly so we can resolve it.
          </p>
        </div>

        <div className="terms-section">
          <h2>Use of Website</h2>
          <p>
            You agree not to misuse the website or attempt to disrupt its
            operation. Content and branding are the property of {config.businessInfo.name}.
          </p>
        </div>

        <div className="terms-section">
          <h2>Limitation of Liability</h2>
          <p>
            {config.businessInfo.name} is not responsible for indirect or
            incidental damages arising from the use of this website or the
            purchase of products.
          </p>
        </div>

        <div className="terms-section">
          <h2>Contact</h2>
          <p>
            For questions regarding these terms, contact us at
            {` ${config.businessInfo.email}`} or {config.businessInfo.phone}.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
