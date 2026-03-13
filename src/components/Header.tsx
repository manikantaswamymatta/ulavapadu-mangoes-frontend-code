"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import "./Header.css";
import config from "@/src/data/config.json";
import { getPricingData } from "@/src/utils/apiResponseCache";
import { loadDiscountConfig } from "@/src/utils/discountConfig";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const deliveryArea = config.delivery.deliveryArea || config.businessInfo.address || "Your area";
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [discountBanner, setDiscountBanner] = useState(() => loadDiscountConfig().banner);
  const searchShellRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Order" },
    { href: "/cart", label: "Cart" },
    { href: "/track", label: "Track" },
    { href: "/contact", label: "Location" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  useEffect(() => {
    const syncBanner = () => {
      setDiscountBanner(loadDiscountConfig().banner);
    };

    syncBanner();
    window.addEventListener("discount-config-updated", syncBanner);
    window.addEventListener("storage", syncBanner);

    return () => {
      window.removeEventListener("discount-config-updated", syncBanner);
      window.removeEventListener("storage", syncBanner);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen || productNames.length > 0 || isLoadingNames) return;

    let isActive = true;
    setIsLoadingNames(true);

    getPricingData()
      .then((data) => {
        if (!isActive) return;
        const names = (Array.isArray(data?.categories) ? data.categories : [])
          .flatMap((group: any) => (Array.isArray(group?.items) ? group.items : []))
          .map((item: any) => (typeof item?.name === "string" ? item.name.trim() : ""))
          .filter((name: string) => name.length > 0);
        setProductNames(Array.from(new Set(names)));
      })
      .catch(() => {
        if (isActive) setProductNames([]);
      })
      .finally(() => {
        if (isActive) setIsLoadingNames(false);
      });

    return () => {
      isActive = false;
    };
  }, [searchOpen, productNames.length, isLoadingNames]);

  useEffect(() => {
    if (!searchOpen) return;

    function onOutsideClick(event: MouseEvent) {
      if (!searchShellRef.current) return;
      if (!searchShellRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setSearchFocused(false);
      }
    }

    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [searchOpen]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!normalizedSearch) return [];

    const startsWith = productNames.filter((name) => name.toLowerCase().startsWith(normalizedSearch));
    const contains = productNames.filter(
      (name) => !name.toLowerCase().startsWith(normalizedSearch) && name.toLowerCase().includes(normalizedSearch)
    );

    return [...startsWith, ...contains].slice(0, 10);
  }, [normalizedSearch, productNames]);

  const showSuggestions = searchOpen && searchFocused && normalizedSearch.length > 0;

  const goToProducts = (keyword: string) => {
    const query = keyword.trim();
    if (query.length === 0) {
      router.push("/products");
    } else {
      router.push(`/products?q=${encodeURIComponent(query)}`);
    }
    setSearchOpen(false);
    setSearchFocused(false);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToProducts(searchQuery);
  };

  const toggleSearch = () => {
    setSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      return next;
    });
  };

  return (
    <>
      {discountBanner.enabled && discountBanner.message ? (
        <div className="discount-strip">
          <span>{discountBanner.message}</span>
        </div>
      ) : null}
      <header className="header">
        <div className="header-container">
          <Link href="/" className="logo">
            <img src="/ulavapadumangoes-logo-v2.png" alt={config.businessInfo.name || "Logo"} />
            <div>
              <h1>{config.businessInfo.name || "Ulavapadu Mangoes"}</h1>
              <p>{config.businessInfo.tagline || "Fresh Mangoes"}</p>
            </div>
          </Link>

          <div className="location-pill">
            <FaMapMarkerAlt />
            <span>{deliveryArea}</span>
          </div>

          <nav className="nav">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? "active" : ""}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="header-search-shell" ref={searchShellRef}>
            <button
              type="button"
              className="header-search-icon"
              aria-label="Search products"
              aria-expanded={searchOpen}
              aria-controls="header-search-panel"
              onClick={toggleSearch}
            >
              <FaSearch />
            </button>

            {searchOpen ? (
              <div className="header-search-panel" id="header-search-panel">
                <form className="header-search" onSubmit={handleSearchSubmit}>
                  <FaSearch />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                    placeholder="Search mango products..."
                    aria-label="Search products"
                  />
                  <button type="submit">Search</button>
                </form>

                {showSuggestions ? (
                  <div className="header-search-suggestions" role="listbox" aria-label="Header product suggestions">
                    {suggestions.length > 0 ? (
                      suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="header-search-suggestion"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => goToProducts(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))
                    ) : (
                      <p className="header-search-empty">
                        {isLoadingNames ? "Loading products..." : "No matching products"}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
}
