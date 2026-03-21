import Footer from "@/src/components/Footer";
import "./ReviewsPage.css";
import { reviewsSection } from "./reviewsData";

export const metadata = {
  title: "Reviews | Ulavapadu Mangoes",
};

export default function ReviewsPage() {
  return (
    <>
      <section className="z-reviews-hero">
        <span className="z-tag">{reviewsSection.tag}</span>
        <h1>{reviewsSection.title}</h1>
        <p>{reviewsSection.subtitle}</p>

        <div className="z-stats">
          {reviewsSection.stats.map((stat, index) => (
            <div key={index} className="z-stat">
              <h2>{stat.value}</h2>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="z-reviews-grid">
        {reviewsSection.reviews.map((review) => (
          <article key={review.id} className="z-review-card">
            <div className="z-stars">
              {"*".repeat(review.rating)}
              {".".repeat(5 - review.rating)}
            </div>

            <p className="z-comment">&quot;{review.comment}&quot;</p>

            <div className="z-author">
              <div className="z-avatar">{review.name.charAt(0)}</div>
              <div>
                <strong>{review.name}</strong>
                <span>{review.location}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="z-reviews-cta">
        <h2>Ready to order fresh mangoes?</h2>
        <p>
          Join regular customers who trust our quality, freshness, and on-time delivery.
        </p>

        <div className="z-cta-buttons">
          <a href="/products" className="z-btn z-btn-primary">Order now</a>
          <a href="/contact" className="z-btn z-btn-secondary">Contact support</a>
        </div>
      </section>

      <Footer />
    </>
  );
}
