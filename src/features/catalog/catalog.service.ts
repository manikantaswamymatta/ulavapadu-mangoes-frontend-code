import { requestBackend } from "@/src/shared/api/backendProxyClient";

import type { MangoCatalogResponse, MangoCategory, MangoProduct } from "./catalog.types";

export async function fetchMangoCatalog(): Promise<MangoCatalogResponse> {
  return requestBackend<MangoCatalogResponse>("/pricing/");
}

export async function fetchMangoCategories(): Promise<MangoCategory[]> {
  return requestBackend<MangoCategory[]>("/pricing/categories");
}

export async function fetchMangoBestsellers(): Promise<MangoProduct[]> {
  return requestBackend<MangoProduct[]>("/bestsellers/");
}
