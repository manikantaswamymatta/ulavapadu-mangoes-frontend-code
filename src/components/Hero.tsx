"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "./Hero.css";

interface HeroSlide {
  id: number;
  badge: string;
  title: string;
  description: string;
  image: string;
  shopLink: string;
  learnLink: string;
}

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    badge: "Farm Fresh This Season",
    title: "Premium Banganapalli Mangoes",
    description: "Naturally ripened, sweet and aromatic mangoes sourced from Ulavapadu farms",
    image: "/categories/banganapalli-mango.jpg",
    shopLink: "/products",
    learnLink: "/about",
  },
  {
    id: 2,
    badge: "Juicy Andhra Favorite",
    title: "Cheruku Rasalu Selection",
    description: "Rich flavor and juice-packed Rasalu mangoes for families and bulk orders",
    image: "/categories/rasalu-mango.jpg",
    shopLink: "/products",
    learnLink: "/about",
  },
  {
    id: 3,
    badge: "Special for Pickle Lovers",
    title: "Raw Pickle Mango Crates",
    description: "Firm, tangy raw mangoes perfect for authentic avakaya preparation",
    image: "/categories/raw-mango.jpg",
    shopLink: "/products",
    learnLink: "/about",
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const inApp =
      ua.includes("instagram") ||
      ua.includes("fbav") ||
      ua.includes("fban") ||
      ua.includes("fb_iab") ||
      ua.includes("messenger");
    setIsInAppBrowser(inApp);
  }, []);

  const openInExternalBrowser = () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const currentUrl = window.location.href;
    const isAndroid = /android/i.test(navigator.userAgent);

    if (isAndroid) {
      const withoutScheme = currentUrl.replace(/^https?:\/\//i, "");
      window.location.href = `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }

    window.open(currentUrl, "_blank", "noopener,noreferrer");
  };

  const handlePrevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length
    );
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const slide = heroSlides[currentSlide];

  return (
    <section className="hero">
      <div className="hero-container">
        {isInAppBrowser ? (
          <div className="inapp-browser-banner">
            <p>
              For smooth payments, please open this site in Chrome/Safari instead of Instagram/Facebook browser.
            </p>
            <button type="button" className="inapp-open-btn" onClick={openInExternalBrowser}>
              Open in Chrome/Safari
            </button>
          </div>
        ) : null}

        {/* Left Content */}
        <div className="hero-content">
          <span className="badge">{slide.badge}</span>

          <h1>{slide.title}</h1>

          <p>{slide.description}</p>

          <div className="hero-buttons">
            <Link href={slide.shopLink} className="btn-primary">
              Shop Now <span>→</span>
            </Link>
            <Link href={slide.learnLink} className="btn-outline">
              Learn More
            </Link>
          </div>

          {/* Navigation Arrows and Dots */}
          <div className="hero-controls">
            <button
              className="arrow-btn left-arrow"
              onClick={handlePrevSlide}
              aria-label="Previous slide"
            >
              ‹
            </button>

            <div className="slide-dots">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === currentSlide ? "active" : ""}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              className="arrow-btn right-arrow"
              onClick={handleNextSlide}
              aria-label="Next slide"
            >
              ›
            </button>
          </div>
        </div>

        {/* Right Image */}
        <div className="hero-image">
          <div className="ring">
            <img
              src={slide.image}
              alt={slide.title}
              className="slide-image"
            />
          </div>

          <div className="homemade">
            <strong>100%</strong>
            <span>Homemade</span>
          </div>
        </div>
      </div>
    </section>
  );
}
