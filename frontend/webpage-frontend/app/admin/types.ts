export type OrderStatus =
  | "created"
  | "payment_initiated"
  | "paid"
  | "booked"
  | "order confirmed"
  | "order shipped"
  | "order delivered"
  | "cancelled";

export type OrderRow = {
  order_id: number;
  status: OrderStatus;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  address?: string;
  items?: unknown;
  delivery_fee?: number;
  total_amount?: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductRow = {
  product_id: number;
  product_name: string;
  description?: string;
  image?: string;
  category_id?: number;
  category_name?: string;
  price_1kg?: number;
  price_2kg?: number;
  price_5kg?: number;
  stock_qty?: number;
  bestseller?: boolean;
};

export type CategoryRow = {
  id: number;
  name: string;
  image?: string;
};
