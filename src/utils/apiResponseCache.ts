"use client";

type CacheEntry<T> = {
  ts: number;
  data: T;
};

const TTL_MS = 5 * 60 * 60 * 1000; // 5 hours
const PREFIX = "api_cache_v3:";
const memoryCache: Record<string, CacheEntry<unknown>> = {};
const pending: Record<string, Promise<unknown> | undefined> = {};

const BACKEND_PROXY_API = "/api/backend-proxy";

function backendProxyUrl(path: string): string {
  return `${BACKEND_PROXY_API}?path=${encodeURIComponent(path)}`;
}

function getLocal<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.ts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function setLocal<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Ignore storage failures.
  }
}

async function fetchWithCache<T>(key: string, url: string): Promise<T> {
  const now = Date.now();
  const mem = memoryCache[key] as CacheEntry<T> | undefined;
  if (mem && now - mem.ts < TTL_MS) return mem.data;

  const local = getLocal<T>(key);
  if (local && now - local.ts < TTL_MS) {
    memoryCache[key] = local as CacheEntry<unknown>;
    return local.data;
  }

  if (pending[key]) return pending[key] as Promise<T>;

  pending[key] = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${key}`);
    }
    const data = (await res.json()) as T;
    const entry: CacheEntry<T> = { ts: Date.now(), data };
    memoryCache[key] = entry as CacheEntry<unknown>;
    setLocal<T>(key, entry);
    return data;
  })().finally(() => {
    pending[key] = undefined;
  });

  return pending[key] as Promise<T>;
}

export function clearApiCacheKey(key: string): void {
  delete memoryCache[key];
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PREFIX + key);
  }
}

export async function getPricingData(): Promise<{ categories: any[] }> {
  return fetchWithCache<{ categories: any[] }>("pricing", backendProxyUrl("/pricing/"));
}

export async function getCategoriesData(): Promise<any[]> {
  return fetchWithCache<any[]>("categories", backendProxyUrl("/pricing/categories"));
}

export async function getBestsellersData(): Promise<any[]> {
  return fetchWithCache<any[]>("bestsellers", backendProxyUrl("/bestsellers/"));
}

