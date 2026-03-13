"use client";

import React from "react";
import "./BestSellers.css";
import ProductCard from "./ProductCard";
import { getBestsellersData } from "@/src/utils/apiResponseCache";

type BestsellerProduct = {
  product_id?: number;
  _id?: string;
  slug?: string;
  name?: string;
  image?: string;
  description?: string;
  category?: string;
  prices?: Record<string, number>;
};

type ProductCardData = {
  product_id?: number;
  name: string;
  image: string;
  description?: string;
  category?: string;
  prices: Record<string, number>;
};

function toProductCardData(value: BestsellerProduct, index: number): ProductCardData | null {
  const prices = value.prices;
  if (!prices || typeof prices !== "object" || Object.keys(prices).length === 0) {
    return null;
  }

  return {
    product_id: value.product_id,
    name: value.name || `Product ${index + 1}`,
    image: value.image || "/placeholder.jpg",
    description: value.description,
    category: value.category,
    prices,
  };
}

export default function BestSellers() {
  const [featuredProducts, setFeaturedProducts] = React.useState<ProductCardData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadBestsellers = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getBestsellersData();
      if (Array.isArray(data)) {
        const safeProducts = data
          .filter(Boolean)
          .slice(0, 8)
          .map((item, index) => toProductCardData(item as BestsellerProduct, index))
          .filter((item): item is ProductCardData => item !== null);
        setFeaturedProducts(safeProducts);
      } else {
        setFeaturedProducts([]);
      }
    } catch {
      setFeaturedProducts([]);
      setError("Unable to load products now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBestsellers();
  }, [loadBestsellers]);

  return (
    <section className="bestsellers">
      <span className="pill">Featured Products</span>
      <h2>Our Bestsellers</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>
          <div style={{ color: "red" }}>{error}</div>
          <button className="view-all" type="button" onClick={loadBestsellers} style={{ marginTop: 10 }}>
            Retry
          </button>
        </div>
      ) : (
        <div className="bestseller-grid">
          {featuredProducts.map((product, index) => {
            const key =
              product.product_id ??
              `${product.name || "product"}-${index}`;
            return <ProductCard key={key} product={product} />;
          })}
        </div>
      )}
      <a href="/products" className="view-all">
        View All Products
      </a>
    </section>
  );
}
