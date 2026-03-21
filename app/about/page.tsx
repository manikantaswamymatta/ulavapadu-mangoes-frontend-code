import Footer from "../../src/components/Footer";
import "./AboutPage.css";

export const metadata = {
  title: "About | Ulavapadu Mangoes",
  description: "Learn how Ulavapadu Mangoes delivers fresh and organic mangoes directly from farm to your home.",
};

export default function AboutPage() {
  return (
    <>
      <section className="z-about-hero">
        <div className="z-about-copy">
          <span>About Ulavapadu Mangoes</span>
          <h1>Farm to home mango delivery you can trust</h1>
          <p>
            We aim at delivering fresh and organic mangoes directly from farm to your home.
            From Banganapalli and Totapuri to Rasalu and raw pickle mangoes, every order is selected
            for quality, taste, and freshness.
          </p>
          <p>
            Our focus is simple: 100% organic produce, fair price-per-kg offers, and reliable doorstep delivery across Hyderabad.
          </p>
        </div>

        <div className="z-about-logo">
          <img src="/ulavapadumangoes-logo-v2.png" alt="Ulavapadu Mangoes logo" />
          <div className="z-about-badge">
            <strong>10+ Years</strong>
            <span>Farm trust</span>
          </div>
        </div>
      </section>

      <section className="z-about-grid-wrap">
        <h2>What makes us different</h2>
        <div className="z-about-grid">
          <div className="z-about-card">
            <strong>Direct from farm</strong>
            <p>Fresh stock supplied directly from our farm network.</p>
          </div>
          <div className="z-about-card">
            <strong>100% organic</strong>
            <p>Naturally grown produce handled with care.</p>
          </div>
          <div className="z-about-card">
            <strong>Price/Kg clarity</strong>
            <p>Transparent and simple pricing for every variety.</p>
          </div>
          <div className="z-about-card">
            <strong>Quick support</strong>
            <p>Fast order help through WhatsApp and phone support.</p>
          </div>
        </div>
      </section>

      <section className="z-about-timeline">
        <h2>Our growth timeline</h2>
        <div className="z-about-steps">
          <div>
            <h3>2014</h3>
            <p>Started with local seasonal mango supply.</p>
          </div>
          <div>
            <h3>2018</h3>
            <p>Expanded into multiple mango varieties.</p>
          </div>
          <div>
            <h3>2022</h3>
            <p>Added online ordering and doorstep delivery.</p>
          </div>
          <div>
            <h3>2026</h3>
            <p>Now running as a full digital mango ordering service.</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
