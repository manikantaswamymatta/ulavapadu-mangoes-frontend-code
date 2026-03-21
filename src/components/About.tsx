"use client";

import Link from "next/link";
import "./About.css";

export default function About() {
  return (
    <section className="about">
      <div className="about-container">
        <div className="about-image">
          <img src="/ulavapadumangoes-logo-v2.png" alt="Ulavapadu Mangoes" />

          <div className="experience-badge">
            <strong>10+</strong>
            <span>Years of Excellence</span>
          </div>
        </div>

        <div className="about-content">
          <span className="about-pill">About Us</span>

          <h2>Fresh Mangoes from Trusted Farms</h2>

          <p>
            At Ulavapadu Mangoes, we bring you premium mango varieties and mango products sourced
            directly from trusted farms. Every batch is selected carefully to ensure freshness,
            taste, and consistent quality.
          </p>

          <ul className="about-points">
            <li>Farm-direct seasonal sourcing</li>
            <li>Carefully graded premium fruits</li>
            <li>No artificial ripening methods</li>
            <li>Hygienic handling and packing</li>
            <li>Fresh dispatch for every order</li>
          </ul>

          <Link href="/about" className="about-btn">
            Read Our Story <span>-&gt;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
