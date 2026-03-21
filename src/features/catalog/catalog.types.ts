export type PriceMap = Record<string, number>;

export type MangoProduct = {
  product_id: number;
  name: string;
  description?: string;
  image?: string;
  stock_qty?: number;
  prices: PriceMap;
  category?: string;
};

export type MangoCategory = {
  id: number;
  name: string;
  image?: string;
};

export type MangoCatalogGroup = {
  category: string;
  items: MangoProduct[];
};

export type MangoCatalogResponse = {
  categories: MangoCatalogGroup[];
};
