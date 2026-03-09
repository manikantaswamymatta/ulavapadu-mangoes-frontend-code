"use client";

import Link from "next/link";
import "./Categories.css";
import { useEffect, useState } from "react";
import { getCategoriesData } from "@/src/utils/apiResponseCache";

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  useEffect(() => {
    getCategoriesData()
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]);
        }
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <section className="categories">
      <div className="categories-container">
        <span className="pill">Our Collection</span>
        <h2>Explore Our Categories</h2>
        <p>
          Discover the authentic taste of traditional Indian foods crafted with love and the finest ingredients
        </p>

        <div className="category-grid">
          {Array.isArray(categories) && categories.length > 0 ? (
            categories.map((cat) => (
              <Link 
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.name)}`}
                className="category-card"
              >
                {cat.image && (
                  <img src={cat.image} alt={cat.name} className="category-image" />
                )}
                <h3>{cat.name}</h3>
              </Link>
            ))
          ) : (
            <div style={{ width: '100%', textAlign: 'center', color: '#888', padding: '32px 0' }}>
              No categories found.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
