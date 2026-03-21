"use client";

import { useState } from "react";
import Footer from "@/src/components/Footer";
import "./ContactPage.css";
import config from "@/src/data/config.json";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.message) {
      alert("Please fill required fields");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data?.redirectUrl) {
        window.open(data.redirectUrl, "_blank");
      }
    } catch (err) {
      console.error("Contact submit error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <section className="z-contact-page">
        <div className="z-contact-hero">
          <h1>Order and Support</h1>
          <p>Need help with order, delivery, or franchise details? Reach us instantly.</p>
        </div>

        <div className="z-contact-content">
          <div className="z-contact-info">
            <h2>Contact Information</h2>

            <p><strong>Phone</strong><br />{config.businessInfo.phone}</p>
            <p><strong>Alternate Phone</strong><br />{config.businessInfo.alternatePhone || "-"}</p>
            <p><strong>Address</strong><br />{config.businessInfo.address}</p>

            <div className="z-map-location">
              <strong>Location on Google Maps</strong>
              <p>Open our exact location and get directions instantly.</p>
              <a href={config.businessInfo.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                Open in Google Maps
              </a>
            </div>

            <p>
              <strong>Instagram</strong><br />
              <a href={config.businessInfo.instagram} target="_blank" rel="noopener noreferrer">
                {(config.businessInfo as any).instagramHandle || config.businessInfo.instagram}
              </a>
            </p>

            <div className="z-quick-whatsapp">
              <h3>Quick WhatsApp</h3>
              <p>Tap below to open WhatsApp with your query.</p>
              <button onClick={handleSubmit}>Chat on WhatsApp</button>
            </div>
          </div>

          <div className="z-contact-form">
            <h2>Send Message</h2>
            <input name="name" placeholder="Enter your full name" onChange={handleChange} />
            <input name="phone" placeholder="Enter your phone number" onChange={handleChange} />
            <input name="email" placeholder="Enter your email address" onChange={handleChange} />
            <textarea name="message" placeholder="How can we help you?" onChange={handleChange} />
            <button onClick={handleSubmit}>Send via WhatsApp</button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
