"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchMangoBestsellers,
  fetchMangoCatalog,
  fetchMangoCategories,
} from "@/src/features/catalog/catalog.service";
import { flattenCatalog } from "@/src/features/catalog/catalog.utils";
import type { MangoCatalogGroup, MangoCategory, MangoProduct } from "@/src/features/catalog/catalog.types";

type MangoHomeData = {
  catalog: MangoCatalogGroup[];
  categories: MangoCategory[];
  bestsellers: MangoProduct[];
  isLoading: boolean;
  error: string | null;
};

export function useMangoHomeData(): MangoHomeData {
  const [catalog, setCatalog] = useState<MangoCatalogGroup[]>([]);
  const [categories, setCategories] = useState<MangoCategory[]>([]);
  const [bestsellers, setBestsellers] = useState<MangoProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([fetchMangoCatalog(), fetchMangoCategories(), fetchMangoBestsellers()])
      .then(([catalogResult, categoriesResult, bestsellersResult]) => {
        if (!isActive) return;

        if (catalogResult.status === "fulfilled") {
          setCatalog(Array.isArray(catalogResult.value?.categories) ? catalogResult.value.categories : []);
        }

        if (categoriesResult.status === "fulfilled") {
          setCategories(Array.isArray(categoriesResult.value) ? categoriesResult.value : []);
        }

        if (bestsellersResult.status === "fulfilled") {
          setBestsellers(Array.isArray(bestsellersResult.value) ? bestsellersResult.value : []);
        }

        const hasFailure =
          catalogResult.status === "rejected" || categoriesResult.status === "rejected";

        if (hasFailure) {
          setError("Unable to load some homepage data right now.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const fallbackBestsellers = useMemo(() => {
    const products = flattenCatalog(catalog);
    return products.slice(0, 6);
  }, [catalog]);

  return {
    catalog,
    categories,
    bestsellers: bestsellers.length > 0 ? bestsellers : fallbackBestsellers,
    isLoading,
    error,
  };
}
