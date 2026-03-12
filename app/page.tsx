"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import config from "@/src/data/config.json";
import { useCart } from "@/src/context/CartContext";
import Footer from "@/src/components/Footer";
import { useMangoHomeData } from "@/src/features/home/useMangoHomeData";
import { flattenCatalog, getPreferredWeights, resolveCatalogImage } from "@/src/features/catalog/catalog.utils";
import type { MangoProduct } from "@/src/features/catalog/catalog.types";

const FALLBACK_IMAGE = "/ulavapadumangoes-logo-v2.png";

function getProductKey(product: MangoProduct, index: number): string {
  return typeof product.product_id === "number"
    ? `product-${product.product_id}`
    : `${product.name || "mango"}-${index}`;
}

export default function HomePage() {
  const { addToCart } = useCart();
  const { catalog, categories, bestsellers, isLoading, error } = useMangoHomeData();

  const [selectedWeightByKey, setSelectedWeightByKey] = useState<Record<string, string>>({});

  const deliveryArea =
    (config as any).delivery?.deliveryArea || (config as any).businessInfo?.address || "your area";

  const topCategories = useMemo(() => categories.slice(0, 8), [categories]);

  const infoTiles = useMemo(() => {
    const pool = bestsellers.length > 0 ? bestsellers : flattenCatalog(catalog);
    return pool.slice(0, 3);
  }, [bestsellers, catalog]);

  const stats = useMemo(() => {
    const allProducts = flattenCatalog(catalog);
    return {
      products: allProducts.length,
      categories: categories.length,
    };
  }, [catalog, categories]);

  const pickWeight = (product: MangoProduct, index: number): string => {
    const key = getProductKey(product, index);
    const configured = selectedWeightByKey[key];
    if (configured) return configured;
    const weights = getPreferredWeights(product.prices || {});
    return weights[0] || "";
  };

  const addBestsellerToCart = (product: MangoProduct, index: number) => {
    const selectedWeight = pickWeight(product, index);
    const amount = (product.prices || {})[selectedWeight];
    if (typeof product.product_id !== "number" || typeof amount !== "number") return;

    addToCart({
      product_id: product.product_id,
      name: product.name || "Mango Product",
      image: resolveCatalogImage(product.image, FALLBACK_IMAGE),
      price: amount,
      weight: selectedWeight || "1Kg",
      category: product.category || "Mangoes",
    });
  };

  return (
    <>
      <main className="mango-home">
        <section className="mango-home__hero">
        <div className="mango-home__hero-bg" aria-hidden="true" />
        <div className="mango-home__container mango-home__hero-content">
          <p className="mango-home__campaign">Mango Season Live</p>
          <h1>Fresh Mangoes from Ulavapadu</h1>
          <p className="mango-home__subtext">
            Simple ordering, trusted quality, and quick dispatch directly from farm to your home.
          </p>

          <div className="mango-home__hero-metrics">
            <article>
              <strong>{stats.products}+</strong>
              <span>Farm Fresh Products</span>
            </article>
            <article>
              <strong>{stats.categories}+</strong>
              <span>Mango Varieties</span>
            </article>
          </div>
        </div>
        </section>

        <section className="mango-home__container">
        <div className="mango-home__section-header mango-home__section-header--bestsellers">
          <h2>Best Seller Items</h2>
          <Link href="/products">See More</Link>
        </div>

        {isLoading ? <p className="mango-home__message">Loading bestsellers...</p> : null}
        {!isLoading && error ? <p className="mango-home__message mango-home__message--error">{error}</p> : null}

        <div className="mango-home__product-grid">
          {bestsellers.slice(0, 8).map((product, index) => {
            const productKey = getProductKey(product, index);
            const weights = getPreferredWeights(product.prices || {});
            const selectedWeight = pickWeight(product, index);
            const selectedPrice = (product.prices || {})[selectedWeight];

            return (
              <article key={productKey} className="mango-home__product-card">
                <img src={resolveCatalogImage(product.image, FALLBACK_IMAGE)} alt={product.name} />
                <div className="mango-home__product-content">
                  <h3>{product.name}</h3>
                  <p>{product.category || "Mangoes"}</p>
                  <div className="mango-home__weights">
                    {weights.map((weight) => (
                      <button
                        key={weight}
                        type="button"
                        className={selectedWeight === weight ? "active" : ""}
                        onClick={() =>
                          setSelectedWeightByKey((prev) => ({
                            ...prev,
                            [productKey]: weight,
                          }))
                        }
                      >
                        {weight}
                      </button>
                    ))}
                  </div>

                  <div className="mango-home__product-footer">
                    <strong>Rs {typeof selectedPrice === "number" ? selectedPrice : "-"}</strong>
                    <button type="button" onClick={() => addBestsellerToCart(product, index)}>
                      Add +
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        </section>

        <section className="mango-home__container">
        <div className="mango-home__section-header mango-home__section-header--category">
          <h2>Categories</h2>
          <Link href="/products">See All</Link>
        </div>
        <div className="mango-home__category-grid">
          {topCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${encodeURIComponent(category.name)}`}
              className="mango-home__category-card"
            >
              <img src={resolveCatalogImage(category.image, FALLBACK_IMAGE)} alt={category.name} />
              <h3>{category.name}</h3>
            </Link>
          ))}
        </div>
        </section>

        <section className="mango-home__container">
        <div className="mango-home__section-header">
          <h2>Item Information</h2>
          <Link href="/products">Open Items Page</Link>
        </div>
        <div className="mango-home__info-grid">
          {infoTiles.map((item, index) => (
            <Link
              key={getProductKey(item, index)}
              href={item.name ? `/products?q=${encodeURIComponent(item.name)}` : "/products"}
              className="mango-home__info-tile"
            >
              <img src={resolveCatalogImage(item.image, FALLBACK_IMAGE)} alt={item.name || "Mango"} />
              <div>
                <h3>{item.name || "Mango Item"}</h3>
                <p>{item.category || "Mangoes"}</p>
              </div>
            </Link>
          ))}
        </div>
        </section>

        <section className="mango-home__container">
        <div className="mango-home__franchise">
          <h2>{(config as any).franchise?.title || "Franchise With Us"}</h2>
          <p>
            Build your local mango outlet with our complete support model, branding, and day-to-day farm stock supply.
          </p>
          <div className="mango-home__franchise-grid">
            {(((config as any).franchise?.benefits as string[]) || []).map((benefit) => (
              <article key={benefit}>{benefit}</article>
            ))}
          </div>
          <p className="mango-home__franchise-branches">
            <strong>Branches:</strong> {(((config as any).franchise?.branches as string[]) || []).join(" | ")}
          </p>
        </div>
        </section>

        <section className="mango-home__container mango-home__cta">
        <h2>Order Now</h2>
        <p>
          100% organic produce, directly from farm to home. Reach us instantly on WhatsApp for quick ordering support.
        </p>
        <div>
          <Link href="/products">Start Shopping</Link>
          <Link href="/contact" className="secondary">Talk to Support</Link>
        </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
