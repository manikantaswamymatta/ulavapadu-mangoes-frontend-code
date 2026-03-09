"use client";

import { useState } from "react";
import { useCart } from "@/src/context/CartContext";
import { getPricingData } from "@/src/utils/apiResponseCache";
import { resolveCatalogImage } from "@/src/features/catalog/catalog.utils";
import "./ProductCard.css";

interface ProductCardData {
  product_id?: number;
  name: string;
  image: string;
  description?: string;
  category?: string;
  prices: Record<string, number>;
}

interface PricingResponse {
  categories?: Array<{
    items?: Array<{
      name?: string;
      product_id?: number;
    }>;
  }>;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const { addToCart } = useCart();
  const weightOptions = Object.keys(product.prices);
  const [selectedWeight, setSelectedWeight] = useState(
    weightOptions[1] || weightOptions[0]
  );
  const [addedNotification, setAddedNotification] = useState(false);
  const [isResolvingProduct, setIsResolvingProduct] = useState(false);

  const resolveProductIdFromCatalog = async (): Promise<number | undefined> => {
    try {
      const data: PricingResponse = await getPricingData();
      const categories = Array.isArray(data?.categories) ? data.categories : [];

      for (const category of categories) {
        const items = Array.isArray(category?.items) ? category.items : [];
        const matched = items.find((item) => item?.name === product.name);
        if (matched && typeof matched.product_id === "number") {
          return matched.product_id;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const handleAddToCart = async () => {
    if (isResolvingProduct) return;

    let resolvedProductId = product.product_id;
    if (typeof resolvedProductId !== "number") {
      setIsResolvingProduct(true);
      resolvedProductId = await resolveProductIdFromCatalog();
      setIsResolvingProduct(false);
    }

    if (typeof resolvedProductId !== "number") {
      alert(`Unable to add item: product ID missing for ${product.name}`);
      return;
    }

    addToCart({
      product_id: resolvedProductId,
      name: product.name,
      image: resolveCatalogImage(product.image, "/ulavapadumangoes-logo.jpg"),
      price: product.prices[selectedWeight],
      weight: selectedWeight,
      category: product.category || "Sweets",
    });

    setAddedNotification(true);
    setTimeout(() => setAddedNotification(false), 2000);
  };

  return (
    <div className="product-card">
      <div className="product-image-wrap">
        <img src={resolveCatalogImage(product.image, "/ulavapadumangoes-logo.jpg")} alt={product.name} loading="lazy" />
      </div>

      <h3>{product.name}</h3>

      <p className="description">{product.description}</p>

      <div className="weights">
        {weightOptions.map((weight) => (
          <button
            key={weight}
            className={selectedWeight === weight ? "active" : ""}
            onClick={() => setSelectedWeight(weight)}
          >
            {weight}
          </button>
        ))}
      </div>

      <div className="price">
        Rs {product.prices[selectedWeight]} / {selectedWeight}
      </div>

      <div className="card-action-row">
        <button
          className={`add-btn ${addedNotification ? "added" : ""}`}
          onClick={handleAddToCart}
          disabled={isResolvingProduct}
        >
          {isResolvingProduct ? "Loading..." : addedNotification ? "Added" : "Add"}
        </button>
      </div>
    </div>
  );
}
