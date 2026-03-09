"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/src/context/CartContext";
import { getPricingData } from "@/src/utils/apiResponseCache";
import { resolveCatalogImage } from "@/src/features/catalog/catalog.utils";
import "./ProductsClient.css";

type Product = {
  product_id?: number;
  name?: string;
  description?: string;
  image?: string;
  prices?: Record<string, number>;
  category?: string;
};

type CategoryGroup = {
  category?: string;
  items?: Product[];
};

function sortPriceValues(prices: Record<string, number> | undefined): string[] {
  if (!prices || typeof prices !== "object") return [];
  const keys = Object.keys(prices);
  const preferredOrder = ["1Kg", "2Kg", "5Kg"];
  const sorted = [...keys].sort((a, b) => {
    const ia = preferredOrder.indexOf(a);
    const ib = preferredOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return sorted;
}

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const [productsData, setProductsData] = useState<CategoryGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<"popular" | "low" | "high">("popular");
  const [addedNotification, setAddedNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeightByKey, setSelectedWeightByKey] = useState<Record<string, string>>({});

  useEffect(() => {
    getPricingData()
      .then((data) => {
        const groups = Array.isArray(data?.categories) ? data.categories : [];
        setProductsData(groups);
      })
      .catch(() => {
        setProductsData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const categories = useMemo(
    () => ["All Items", ...productsData.map((group) => group.category).filter((name): name is string => !!name)],
    [productsData]
  );

  const allProducts: Product[] = useMemo(
    () =>
      productsData.flatMap((group) =>
        (Array.isArray(group?.items) ? group.items : []).map((item, index) => ({
          ...item,
          category: group.category || `Category ${index + 1}`,
        }))
      ),
    [productsData]
  );

  const productNames = useMemo(() => {
    const names = allProducts
      .map((product) => product.name)
      .filter((name): name is string => typeof name === "string" && name.trim().length > 0);
    return Array.from(new Set(names));
  }, [allProducts]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const searchSuggestions = useMemo(() => {
    if (!normalizedSearch) {
      return [];
    }

    const startsWithMatches = productNames.filter((name) => name.toLowerCase().startsWith(normalizedSearch));
    const containsMatches = productNames.filter(
      (name) => !name.toLowerCase().startsWith(normalizedSearch) && name.toLowerCase().includes(normalizedSearch)
    );
    return [...startsWithMatches, ...containsMatches].slice(0, 8);
  }, [normalizedSearch, productNames]);

  const showSuggestions = isSearchFocused && normalizedSearch.length > 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length > 0) {
      setSelectedCategory("All Items");
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const filteredProducts = useMemo(() => {
    const byCategory = allProducts.filter((product) =>
      selectedCategory === "All Items" ? true : product.category === selectedCategory
    );
    return byCategory.filter((product) => {
      if (!searchQuery.trim()) return true;
      const haystack = `${product.name || ""} ${product.category || ""}`.toLowerCase();
      return haystack.includes(searchQuery.trim().toLowerCase());
    });
  }, [allProducts, selectedCategory, searchQuery]);

  const sortedProducts = useMemo(() => {
    const getLowestPrice = (product: Product): number => {
      const values = Object.values(product.prices || {}).filter((price) => typeof price === "number");
      return values.length > 0 ? Math.min(...values) : 0;
    };

    const next = [...filteredProducts];
    if (sortBy === "low") {
      next.sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
    } else if (sortBy === "high") {
      next.sort((a, b) => getLowestPrice(b) - getLowestPrice(a));
    }
    return next;
  }, [filteredProducts, sortBy]);

  useEffect(() => {
    const requestedCategory = searchParams.get("category");
    const requestedSearch = searchParams.get("q");

    if (requestedSearch && requestedSearch.trim().length > 0) {
      setSearchQuery(requestedSearch);
      setSelectedCategory("All Items");
      return;
    }

    if (requestedCategory && categories.includes(requestedCategory)) {
      setSelectedCategory(requestedCategory);
    } else {
      setSelectedCategory("All Items");
    }

    setSearchQuery("");
  }, [searchParams, categories]);

  const getProductKey = (product: Product, index: number): string =>
    typeof product.product_id === "number" ? `pid-${product.product_id}` : `idx-${index}-${product.name || "product"}`;

  const getSelectedWeight = (product: Product, index: number): string => {
    const key = getProductKey(product, index);
    const configured = selectedWeightByKey[key];
    if (configured) return configured;
    const available = sortPriceValues(product.prices);
    return available[0] || "";
  };

  const handleAddToCart = (product: Product, index: number) => {
    const selectedWeight = getSelectedWeight(product, index);
    const price = (product.prices || {})[selectedWeight];
    if (typeof product.product_id !== "number" || typeof price !== "number") {
      return;
    }

    addToCart({
      product_id: product.product_id,
      name: product.name || "Product",
      image: resolveCatalogImage(product.image, "/ulavapadumangoes-logo.jpg"),
      price,
      weight: selectedWeight || "1Kg",
      category: product.category || "Mangoes",
    });

    const key = getProductKey(product, index);
    setAddedNotification(key);
    setTimeout(() => setAddedNotification(null), 2000);
  };

  return (
    <div className="z-products-page">
      <div className="z-products-hero">
        <h1>Order mangoes online</h1>
        <p>Explore Ulavapadu mango varieties and mango products</p>

        <div className="z-products-search-wrap">
          <div className="z-products-search-box">
            <input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
              placeholder="Search products or categories..."
            />

            {showSuggestions && (
              <div className="z-products-suggestions" role="listbox" aria-label="Product search suggestions">
                {searchSuggestions.length > 0 ? (
                  searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="z-products-suggestion-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setSelectedCategory("All Items");
                        setIsSearchFocused(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))
                ) : (
                  <p className="z-products-search-empty">No matching products</p>
                )}
              </div>
            )}
          </div>

          <select
            className="z-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "popular" | "low" | "high")}
          >
            <option value="popular">Sort: Popular</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
          </select>

          <div className="z-sort-mobile" role="tablist" aria-label="Sort options">
            <button
              type="button"
              className={`z-sort-chip ${sortBy === "popular" ? "active" : ""}`}
              onClick={() => setSortBy("popular")}
            >
              Popular
            </button>
            <button
              type="button"
              className={`z-sort-chip ${sortBy === "low" ? "active" : ""}`}
              onClick={() => setSortBy("low")}
            >
              Low to High
            </button>
            <button
              type="button"
              className={`z-sort-chip ${sortBy === "high" ? "active" : ""}`}
              onClick={() => setSortBy("high")}
            >
              High to Low
            </button>
          </div>
        </div>
      </div>

      <section className="z-products-shell">
        <div className="z-category-chips">
          {categories.map((category) => (
            <button
              key={category}
              className={`z-chip ${selectedCategory === category ? "active" : ""}`}
              onClick={() => handleCategorySelect(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="z-products-meta">
          <p>{sortedProducts.length} items found</p>
        </div>

        <div className="z-products-grid">
          {loading ? (
            <div className="z-empty-state">Loading menu...</div>
          ) : sortedProducts.length === 0 ? (
            <div className="z-empty-state">No items found for your filter. Try another keyword or category.</div>
          ) : (
            sortedProducts.map((product, index) => {
              const productKey = getProductKey(product, index);
              const weights = sortPriceValues(product.prices);
              const selectedWeight = getSelectedWeight(product, index);
              const selectedPrice = (product.prices || {})[selectedWeight];

              return (
                <article key={productKey} className="z-product-card">
                  <div className="z-product-image-wrap">
                    <img
                      src={resolveCatalogImage(product.image, "/ulavapadumangoes-logo.jpg")}
                      alt={product.name || "Product"}
                      className="z-product-image"
                    />
                    <span className="z-rating">4.{(index % 5) + 1} ★</span>
                  </div>

                  <div className="z-product-content">
                    <div className="z-product-head">
                      <h3>{product.name || "Product"}</h3>
                      <strong>Rs {typeof selectedPrice === "number" ? selectedPrice : "-"}</strong>
                    </div>

                    <p>{product.category || "Mangoes"}</p>

                    <div className="size-options">
                      {weights.map((weight) => (
                        <button
                          key={weight}
                          className={`size-option ${selectedWeight === weight ? "active" : ""}`}
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

                    <div className="z-product-actions">
                      <button
                        className={addedNotification === productKey ? "added" : ""}
                        onClick={() => handleAddToCart(product, index)}
                      >
                        {addedNotification === productKey ? "Added" : "Add +"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
