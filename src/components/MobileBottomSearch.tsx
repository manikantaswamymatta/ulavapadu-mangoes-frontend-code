"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaSearch } from "react-icons/fa";
import { getPricingData } from "@/src/utils/apiResponseCache";
import "./MobileBottomSearch.css";

type ProductItem = {
  name?: string;
};

type CategoryBlock = {
  items?: ProductItem[];
};

export default function MobileBottomSearch() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryBlock[]>([]);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    getPricingData()
      .then((data) => {
        const list = Array.isArray(data?.categories) ? data.categories : [];
        setCategories(list);
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  const productNames = useMemo(() => {
    const names = categories.flatMap((category) =>
      (Array.isArray(category?.items) ? category.items : [])
        .map((item) => item?.name)
        .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    );
    return Array.from(new Set(names));
  }, [categories]);

  const trimmedQuery = query.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }

    const startsWithMatches = productNames.filter((name) => name.toLowerCase().startsWith(trimmedQuery));
    const containsMatches = productNames.filter(
      (name) => !name.toLowerCase().startsWith(trimmedQuery) && name.toLowerCase().includes(trimmedQuery)
    );

    return [...startsWithMatches, ...containsMatches].slice(0, 8);
  }, [trimmedQuery, productNames]);

  const showSuggestions = isFocused && trimmedQuery.length > 0;

  const navigateToSearch = (searchValue: string) => {
    const normalized = searchValue.trim();
    if (!normalized) {
      router.push("/products");
      setIsFocused(false);
      return;
    }

    router.push(`/products?q=${encodeURIComponent(normalized)}`);
    setIsFocused(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigateToSearch(query);
  };

  return (
    <div className="mobile-bottom-search-wrap">
      {showSuggestions && (
        <div className="mobile-search-suggestions" role="listbox" aria-label="Search suggestions">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="mobile-search-suggestion-item"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(suggestion);
                  navigateToSearch(suggestion);
                }}
              >
                {suggestion}
              </button>
            ))
          ) : (
            <p className="mobile-search-empty">No matching products</p>
          )}
        </div>
      )}

      <form className="mobile-bottom-search" onSubmit={handleSubmit}>
        <FaSearch />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 120)}
          placeholder="Search products..."
          aria-label="Search products"
        />
        <button type="submit">Search</button>
      </form>
    </div>
  );
}
