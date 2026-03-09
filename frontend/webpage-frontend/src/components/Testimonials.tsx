"use client";

import Link from "next/link";
import { useState } from "react";
import "./Testimonials.css";

const reviews = [
  {
    text:
      "Premium Banganapalli mangoes arrived fresh, naturally ripened, and exactly as shown.",
    name: "Lakshmi Devi",
    location: "Rajahmundry",
  },
  {
    text:
      "Raw pickle mango quality was excellent. Perfect batch for our avakaya preparation.",
    name: "Venkat Rao",
    location: "Hyderabad",
  },
  {
    text:
      "Rasalu mangoes were juicy and sweet. Family loved every order this season.",
    name: "Padma Kumari",
    location: "Vijayawada",
  },
  {
    text:
      "Timely delivery and consistent quality. Their mango products are also very good.",
    name: "Suresh Kumar",
    location: "Kakinada",
  },
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);

  const prev = () =>
    setIndex((index - 1 + reviews.length) % reviews.length);
  const next = () => setIndex((index + 1) % reviews.length);

  return (
    <section className="testimonials">
      <span className="test-pill">Testimonials</span>
      <h2>What Our Customers Say</h2>

      <div className="testimonial-card">
        <div className="stars">★★★★★</div>

        <p className="review-text">"{reviews[index].text}"</p>

        <div className="reviewer">
          <strong>{reviews[index].name}</strong>
          <span>{reviews[index].location}</span>
        </div>
      </div>

      <div className="controls">
        <button onClick={prev}>‹</button>

        <div className="dots">
          {reviews.map((_, i) => (
            <span key={i} className={i === index ? "active" : ""} />
          ))}
        </div>

        <button onClick={next}>›</button>
      </div>

      <Link href="/reviews" className="see-all">See All Reviews</Link>
    </section>
  );
}
