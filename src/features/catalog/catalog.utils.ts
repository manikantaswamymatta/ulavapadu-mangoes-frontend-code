import type { MangoCatalogGroup, MangoProduct, PriceMap } from "./catalog.types";

const LEGACY_IMAGE_HINTS = ["janatha", "maharaja", "cafe"];
const GENERIC_LOGO_PATTERN = /(^|\/|\\)logo\.(jpg|jpeg|png|webp)$/i;

export function getPreferredWeights(prices: PriceMap): string[] {
  const preferred = ["1Kg", "2Kg", "5Kg"];
  return Object.keys(prices).sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function getDisplayPrice(prices: PriceMap): { weight: string; amount: number } | null {
  const weights = getPreferredWeights(prices);
  const defaultWeight = weights[0];
  if (!defaultWeight) return null;
  const amount = prices[defaultWeight];
  if (typeof amount !== "number") return null;
  return { weight: defaultWeight, amount };
}

export function flattenCatalog(catalog: MangoCatalogGroup[]): MangoProduct[] {
  return catalog.flatMap((group) =>
    (Array.isArray(group.items) ? group.items : []).map((product) => ({
      ...product,
      category: group.category,
    }))
  );
}

export function resolveCatalogImage(image: string | undefined, fallbackImage: string): string {
  if (typeof image !== "string") return fallbackImage;

  const candidate = image.trim();
  if (!candidate) return fallbackImage;

  const normalized = candidate.toLowerCase();
  const hasLegacyHint = LEGACY_IMAGE_HINTS.some((hint) => normalized.includes(hint));
  const isGenericLogo = GENERIC_LOGO_PATTERN.test(normalized) && !normalized.includes("ulavapadu");

  return hasLegacyHint || isGenericLogo ? fallbackImage : candidate;
}
