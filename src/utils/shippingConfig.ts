import defaultShippingRates from "@/src/data/shippingRates.json";

export const SHIPPING_CONFIG_UPDATED_EVENT = "shipping-config-updated";

export type ShippingRateRow = {
  label: string;
  minKg: number;
  maxKg: number | null;
  rates: Record<string, number>;
};

export type ShippingConfig = {
  zones: string[];
  slabs: ShippingRateRow[];
};

function sanitizeZoneList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const zones: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    zones.push(trimmed);
  }

  return zones;
}

function sanitizeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeRates(value: unknown, zones: string[]): Record<string, number> {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return zones.reduce<Record<string, number>>((acc, zone) => {
    const rate = sanitizeNumber(source[zone], 0);
    acc[zone] = rate >= 0 ? rate : 0;
    return acc;
  }, {});
}

function deriveZonesFromSlabs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const zones: string[] = [];

  for (const slab of value) {
    const rates =
      slab && typeof slab === "object" ? (slab as { rates?: unknown }).rates : null;
    if (!rates || typeof rates !== "object") continue;

    for (const key of Object.keys(rates as Record<string, unknown>)) {
      const trimmed = key.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      zones.push(trimmed);
    }
  }

  return zones;
}

function normalizeShippingConfigInput(value: unknown): ShippingConfig {
  const payload =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawSlabs = Array.isArray(payload.slabs) ? payload.slabs : [];
  const rawZones = sanitizeZoneList(payload.zones);
  const derivedZones = deriveZonesFromSlabs(rawSlabs);
  const zones = rawZones.length > 0 ? rawZones : derivedZones;

  const slabs = rawSlabs.map((entry, index) => {
    const row =
      entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const label =
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : `Slab ${index + 1}`;
    const minKg = sanitizeNumber(row.minKg, 0);
    const maxKg = sanitizeOptionalNumber(row.maxKg);

    return {
      label,
      minKg,
      maxKg,
      rates: sanitizeRates(row.rates, zones),
    };
  });

  return { zones, slabs };
}

const DEFAULT_SHIPPING_CONFIG = (() => {
  const normalized = normalizeShippingConfigInput(defaultShippingRates);
  return normalized.zones.length > 0 && normalized.slabs.length > 0
    ? normalized
    : {
        zones: ["AP", "TG", "Banglore", "Chennai"],
        slabs: [],
      };
})();

export function getDefaultShippingConfig(): ShippingConfig {
  return JSON.parse(JSON.stringify(DEFAULT_SHIPPING_CONFIG)) as ShippingConfig;
}

export function normalizeShippingConfig(value: unknown): ShippingConfig {
  const normalized = normalizeShippingConfigInput(value);

  if (normalized.zones.length === 0 || normalized.slabs.length === 0) {
    return getDefaultShippingConfig();
  }

  return normalized;
}
