"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CategoryRow, OrderRow, OrderStatus, ProductRow } from "./types";
import "./AdminPage.css";
import {
  getDefaultDiscountConfig,
  loadDiscountConfig,
  saveDiscountConfig,
  type CouponRule,
} from "@/src/utils/discountConfig";
import {
  getDefaultShippingConfig,
  normalizeShippingConfig,
  SHIPPING_CONFIG_UPDATED_EVENT,
  type ShippingConfig,
  type ShippingRateRow,
} from "@/src/utils/shippingConfig";

const ADMIN_PROXY_API = "/api/admin-proxy";
const SHIPPING_CONFIG_API = "/api/shipping-config";

const orderStatusesApi: Array<OrderStatus | "all"> = [
  "all",
  "created",
  "payment_initiated",
  "paid",
  "booked",
  "order confirmed",
  "order shipped",
  "order delivered",
  "cancelled",
];

function money(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function statusClass(status: string): string {
  const slug = status.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  return `badge badge-${slug}`;
}

async function readResponseMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(text) as { detail?: string; message?: string };
    return payload?.detail || payload?.message || fallback;
  } catch {
    return text;
  }
}

type OrderItem = {
  product_name?: string;
  weight?: string;
  quantity?: number;
};

type CouponFieldRow = {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  active: boolean;
};

function createCouponFieldRow(coupon?: CouponRule, index = 0): CouponFieldRow {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    code: coupon?.code || "",
    type: coupon?.type === "flat" ? "flat" : "percent",
    value: coupon?.value != null ? String(coupon.value) : "",
    minSubtotal: coupon?.minSubtotal != null ? String(coupon.minSubtotal) : "",
    maxDiscount: coupon?.maxDiscount != null ? String(coupon.maxDiscount) : "",
    active: coupon?.active !== false,
  };
}

function parseItems(value: unknown): OrderItem[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as OrderItem[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
  } catch {
    return [];
  }
}

function buildFilteredOrdersDocument(orders: OrderRow[]): string {
  if (orders.length === 0) {
    return `
      <html>
        <body style="font-size:12pt; font-family: Arial, sans-serif;">
          <p>No filtered orders found.</p>
        </body>
      </html>
    `;
  }

  const sections = orders
    .map((order, index) => {
      const itemLines = parseItems(order.items).length
        ? parseItems(order.items)
            .map((item) => `<li>${item.product_name || "Item"} (${item.weight || "-"}) x ${item.quantity || 0}</li>`)
            .join("")
        : "<li>No items found</li>";

      return `
        <div style="margin-bottom:16px;">
          <p><strong>Order ${index + 1}</strong></p>
          <p>Order ID: ${order.order_id}</p>
          <p>Customer: ${order.customer_name || "-"}</p>
          <p>Mobile: ${order.customer_phone || "-"}</p>
          <p>adress: ${order.address || "-"}</p>
          <p>iteams :</p>
          <ul>${itemLines}</ul>
        </div>
      `;
    })
    .join('<hr style="margin:12px 0;" />');

  return `
    <html>
      <body style="font-size:12pt; font-family: Arial, sans-serif;">
        ${sections}
      </body>
    </html>
  `;
}

function formatShippingRange(row: ShippingRateRow): string {
  if (row.maxKg == null) {
    return `${row.minKg} kg and above`;
  }
  return `${row.minKg} kg to ${row.maxKg} kg`;
}

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  
  // API request helper that uses the current adminApiBase
  const request = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const response = await fetch(`${ADMIN_PROXY_API}?path=${encodeURIComponent(path)}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      if (response.status === 401) {
        let sessionAuthenticated = false;
        try {
          const sessionResponse = await fetch("/api/admin-session", { cache: "no-store" });
          if (sessionResponse.ok) {
            const payload = (await sessionResponse.json()) as { authenticated?: boolean };
            sessionAuthenticated = Boolean(payload?.authenticated);
          }
        } catch {
          // Fall back to treating this as a session issue if the session check fails.
        }

        const message = await readResponseMessage(
          response,
          sessionAuthenticated
            ? "Admin backend rejected the request. Check admin proxy configuration."
            : "Unauthorized. Please login again."
        );

        if (!sessionAuthenticated) {
          setIsAuthenticated(false);
          throw new Error("Unauthorized. Please login again.");
        }

        throw new Error(message);
      }

      if (!response.ok) {
        const message = await readResponseMessage(response, `Request failed (${response.status})`);
        throw new Error(message);
      }

      return (await response.json()) as T;
    },
    []
  );
  
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [updatedOrderStatus, setUpdatedOrderStatus] = useState<"order confirmed" | "order shipped" | "order delivered">("order confirmed");

  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newPrice250, setNewPrice250] = useState("");
  const [newPrice500, setNewPrice500] = useState("");
  const [newPrice1000, setNewPrice1000] = useState("");
  const [newStock, setNewStock] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [editPrice250, setEditPrice250] = useState("");
  const [editPrice500, setEditPrice500] = useState("");
  const [editPrice1000, setEditPrice1000] = useState("");
  const [editStock, setEditStock] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryImage, setEditCategoryImage] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [discountBannerEnabled, setDiscountBannerEnabled] = useState(true);
  const [discountBannerMessage, setDiscountBannerMessage] = useState("");
  const [couponRows, setCouponRows] = useState<CouponFieldRow[]>([createCouponFieldRow()]);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(() => getDefaultShippingConfig());
  const [selectedShippingLabel, setSelectedShippingLabel] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingMessage, setShippingMessage] = useState<string | null>(null);

  const orderRevenue = useMemo(
    () => orders
      .filter((item) => 
        item.status === "paid" || 
        item.status === "order shipped" || 
        item.status === "order delivered"
      )
      .reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [orders]
  );

  const shippedRevenue = useMemo(
    () => orders
      .filter((item) => item.status === "order shipped")
      .reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [orders]
  );

  const deliveredRevenue = useMemo(
    () => orders
      .filter((item) => item.status === "order delivered")
      .reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [orders]
  );

  const lowStockCount = useMemo(
    () => products.filter((item) => Number(item.stock_qty || 0) <= 5).length,
    [products]
  );

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.product_id) === selectedProductId) || null,
    [products, selectedProductId]
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.order_id) === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const selectedShippingSlab = useMemo(
    () =>
      shippingConfig.slabs.find((slab) => slab.label === selectedShippingLabel) ||
      shippingConfig.slabs[0] ||
      null,
    [selectedShippingLabel, shippingConfig]
  );

  const filteredProducts = useMemo(() => {
    if (productCategoryFilter === "all") {
      return products;
    }
    if (productCategoryFilter === "none") {
      return products.filter((product) => product.category_id == null);
    }
    return products.filter((product) => String(product.category_id) === productCategoryFilter);
  }, [products, productCategoryFilter]);

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const query = new URLSearchParams();
      if (fromDate) query.set("from_date", fromDate);
      if (toDate) query.set("to_date", toDate);
      if (status && status !== "all") query.set("status", status);
      if (phoneFilter.trim()) query.set("phone", phoneFilter.trim());
      query.set("limit", "400");

      const data = await request<OrderRow[]>(`/orders?${query.toString()}`);
      setOrders(data);
      if (data.length > 0) {
        setSelectedOrderId(String(data[0].order_id));
      } else {
        setSelectedOrderId("");
      }
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Failed to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder) {
      setOrdersError("Select an order to update status.");
      return;
    }

    const confirmed = window.confirm(
      `Change order #${selectedOrder.order_id} status from "${selectedOrder.status}" to "${updatedOrderStatus}"?`
    );
    if (!confirmed) return;

    try {
      setOrdersLoading(true);
      setOrdersError(null);
      await request<{ ok: boolean }>(`/orders/${selectedOrder.order_id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: updatedOrderStatus }),
      });
      await loadOrders();
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Failed to update order status.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      const [productsRes, categoriesRes] = await Promise.all([
        request<ProductRow[]>("/products"),
        request<CategoryRow[]>("/categories"),
      ]);
      setProducts(productsRes);
      setCategories(categoriesRes);
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Failed to load products.");
    } finally {
      setProductsLoading(false);
    }
  };

  const loadDiscountSettings = useCallback(() => {
    const discountConfig = loadDiscountConfig();
    setDiscountBannerEnabled(discountConfig.banner.enabled);
    setDiscountBannerMessage(discountConfig.banner.message);
    const rows = (discountConfig.coupons || []).map((coupon, index) => createCouponFieldRow(coupon, index));
    setCouponRows(rows.length > 0 ? rows : [createCouponFieldRow()]);
  }, []);

  const updateCouponRow = <K extends keyof CouponFieldRow>(
    rowId: string,
    key: K,
    value: CouponFieldRow[K]
  ) => {
    setCouponRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
  };

  const addCouponRow = () => {
    setCouponRows((prev) => [...prev, createCouponFieldRow()]);
  };

  const removeCouponRow = (rowId: string) => {
    const confirmed = window.confirm("Remove this coupon row?");
    if (!confirmed) return;

    setCouponRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      return next.length > 0 ? next : [createCouponFieldRow()];
    });
  };

  const saveDiscountSettings = () => {
    const confirmed = window.confirm("Save discount settings changes?");
    if (!confirmed) return;

    const touchedRows = couponRows.filter((row) => {
      return (
        row.code.trim() ||
        row.value.trim() ||
        row.minSubtotal.trim() ||
        row.maxDiscount.trim()
      );
    });

    if (touchedRows.some((row) => !row.code.trim())) {
      setDiscountMessage("Coupon code is required for filled rows.");
      return;
    }

    const normalizedCoupons: CouponRule[] = touchedRows.map((row) => ({
      code: row.code.trim().toUpperCase(),
      type: row.type === "flat" ? "flat" : "percent",
      value: Number(row.value || 0),
      minSubtotal: row.minSubtotal.trim() ? Number(row.minSubtotal) : undefined,
      maxDiscount: row.maxDiscount.trim() ? Number(row.maxDiscount) : undefined,
      active: row.active,
    }));

    const hasInvalid = normalizedCoupons.some((coupon) => {
      if (!coupon.code || !Number.isFinite(coupon.value) || coupon.value <= 0) return true;
      if (coupon.minSubtotal != null && (!Number.isFinite(coupon.minSubtotal) || coupon.minSubtotal < 0)) return true;
      if (coupon.maxDiscount != null && (!Number.isFinite(coupon.maxDiscount) || coupon.maxDiscount <= 0)) return true;
      return false;
    });

    if (hasInvalid) {
      setDiscountMessage("Enter valid coupon values (value > 0, min subtotal >= 0, max discount > 0).");
      return;
    }

    saveDiscountConfig({
      banner: {
        enabled: discountBannerEnabled,
        message: discountBannerMessage.trim(),
      },
      coupons: normalizedCoupons,
    });

    const refreshedRows = normalizedCoupons.length > 0
      ? normalizedCoupons.map((coupon, index) => createCouponFieldRow(coupon, index))
      : [createCouponFieldRow()];
    setCouponRows(refreshedRows);
    setDiscountMessage("Discount settings saved (frontend only).");
  };

  const resetDiscountSettings = () => {
    const confirmed = window.confirm("Reset discount settings to default values?");
    if (!confirmed) return;

    const defaults = getDefaultDiscountConfig();
    setDiscountBannerEnabled(defaults.banner.enabled);
    setDiscountBannerMessage(defaults.banner.message);
    const rows = (defaults.coupons || []).map((coupon, index) => createCouponFieldRow(coupon, index));
    setCouponRows(rows.length > 0 ? rows : [createCouponFieldRow()]);
    setDiscountMessage("Reset fields to JSON defaults. Click Save to apply.");
  };

  const loadShippingSettings = useCallback(async () => {
    try {
      setShippingLoading(true);
      setShippingError(null);

      const response = await fetch(SHIPPING_CONFIG_API, { cache: "no-store" });
      if (!response.ok) {
        const message = await readResponseMessage(response, "Failed to load shipping rates.");
        throw new Error(message);
      }

      const payload = normalizeShippingConfig(await response.json());
      setShippingConfig(payload);
      setShippingMessage(null);
    } catch (error) {
      setShippingError(error instanceof Error ? error.message : "Failed to load shipping rates.");
    } finally {
      setShippingLoading(false);
    }
  }, []);

  const updateSelectedShippingRate = (zone: string, value: string) => {
    if (!selectedShippingSlab) {
      return;
    }

    const nextRate = value.trim() === "" ? 0 : Number(value);

    setShippingConfig((prev) => ({
      ...prev,
      slabs: prev.slabs.map((slab) =>
        slab.label !== selectedShippingSlab.label
          ? slab
          : {
              ...slab,
              rates: {
                ...slab.rates,
                [zone]: Number.isFinite(nextRate) ? nextRate : 0,
              },
            }
      ),
    }));
    setShippingMessage(null);
    setShippingError(null);
  };

  const saveShippingSettings = async () => {
    if (!selectedShippingSlab) {
      setShippingError("Select a shipping label before saving.");
      return;
    }

    const hasInvalidRates = shippingConfig.slabs.some((slab) =>
      shippingConfig.zones.some((zone) => {
        const rate = slab.rates[zone];
        return !Number.isFinite(rate) || rate < 0;
      })
    );

    if (hasInvalidRates) {
      setShippingError("Enter valid non-negative shipping rates for every zone.");
      return;
    }

    const slabLabel = selectedShippingSlab.label;
    const confirmed = window.confirm(`Save shipping rates for "${slabLabel}"?`);
    if (!confirmed) return;

    try {
      setShippingLoading(true);
      setShippingError(null);
      setShippingMessage(null);

      const response = await fetch(SHIPPING_CONFIG_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shippingConfig),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Unauthorized. Please login again.");
      }

      if (!response.ok) {
        const message = await readResponseMessage(response, "Failed to save shipping rates.");
        throw new Error(message);
      }

      const payload = normalizeShippingConfig(await response.json());
      setShippingConfig(payload);
      setShippingMessage(`Shipping rates saved for "${slabLabel}".`);
      window.dispatchEvent(new Event(SHIPPING_CONFIG_UPDATED_EVENT));
      window.alert(`Shipping rates saved for "${slabLabel}".`);
    } catch (error) {
      setShippingError(error instanceof Error ? error.message : "Failed to save shipping rates.");
    } finally {
      setShippingLoading(false);
    }
  };

  const addProduct = async () => {
    const price250 = Number(newPrice250);
    const price500 = Number(newPrice500);
    const price1000 = Number(newPrice1000);
    const stock = Number(newStock);

    if (
      !newName.trim() ||
      !newImage.trim() ||
      !Number.isFinite(price250) ||
      price250 <= 0 ||
      !Number.isFinite(price500) ||
      price500 <= 0 ||
      !Number.isFinite(price1000) ||
      price1000 <= 0 ||
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      setProductsError("Enter valid name, image, 1kg/2kg/5kg prices and stock.");
      return;
    }

    const confirmed = window.confirm(`Add product \"${newName.trim()}\"?`);
    if (!confirmed) return;

    try {
      setProductsLoading(true);
      setProductsError(null);

      await request<{ product_id: number }>("/products", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          image: newImage.trim(),
          price_1kg: Number(price250.toFixed(2)),
          price_2kg: Number(price500.toFixed(2)),
          price_5kg: Number(price1000.toFixed(2)),
          quantity: Math.floor(stock),
          category_id: newCategoryId ? Number(newCategoryId) : null,
        }),
      });

      setNewName("");
      setNewImage("");
      setNewCategoryId("");
      setNewPrice250("");
      setNewPrice500("");
      setNewPrice1000("");
      setNewStock("");

      await loadProducts();
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Failed to add product.");
    } finally {
      setProductsLoading(false);
    }
  };

  const removeProduct = async (id: number, name: string) => {
    const ok = window.confirm(`Delete product #${id} (${name})?`);
    if (!ok) return;

    try {
      setProductsLoading(true);
      setProductsError(null);
      await request<{ ok: boolean }>(`/products/${id}`, { method: "DELETE" });
      await loadProducts();
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Failed to remove product.");
    } finally {
      setProductsLoading(false);
    }
  };

  const updateProductPrices = async () => {
    if (!selectedProduct) {
      setProductsError("Select a product to update.");
      return;
    }

    const price250 = Number(editPrice250);
    const price500 = Number(editPrice500);
    const price1000 = Number(editPrice1000);
    const stock = Number(editStock);

    if (
      !Number.isFinite(price250) ||
      price250 <= 0 ||
      !Number.isFinite(price500) ||
      price500 <= 0 ||
      !Number.isFinite(price1000) ||
      price1000 <= 0 ||
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      setProductsError("Enter valid updated prices (1kg/2kg/5kg) and stock.");
      return;
    }

    const confirmed = window.confirm(
      `Update #${selectedProduct.product_id} (${selectedProduct.product_name}) prices and stock?`
    );
    if (!confirmed) return;

    try {
      setProductsLoading(true);
      setProductsError(null);

      await request<{ ok: boolean }>(`/products/${selectedProduct.product_id}`, {
        method: "PUT",
        body: JSON.stringify({
          product_name: selectedProduct.product_name,
          description: selectedProduct.description || "",
          image: selectedProduct.image || "",
          category_id: selectedProduct.category_id ?? null,
          price_1kg: Number(price250.toFixed(2)),
          price_2kg: Number(price500.toFixed(2)),
          price_5kg: Number(price1000.toFixed(2)),
          stock_qty: Math.floor(stock),
          bestseller: Boolean(selectedProduct.bestseller),
        }),
      });

      await loadProducts();
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Failed to update product.");
    } finally {
      setProductsLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      setProductsError("Category name is required.");
      return;
    }

    const confirmed = window.confirm(`Add category \"${newCategoryName.trim()}\"?`);
    if (!confirmed) return;

    try {
      setProductsLoading(true);
      setProductsError(null);

      await request<{ id: number }>("/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newCategoryName.trim(),
          image: newCategoryImage.trim() || null,
        }),
      });

      setNewCategoryName("");
      setNewCategoryImage("");
      await loadProducts();
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Failed to add category.");
    } finally {
      setProductsLoading(false);
    }
  };

  const removeCategory = async (id: number, name: string) => {
    const linkedProducts = products.filter((product) => Number(product.category_id) === id).length;
    const ok = window.confirm(
      linkedProducts > 0
        ? `Delete category #${id} (${name})? It is linked to ${linkedProducts} product(s).`
        : `Delete category #${id} (${name})?`
    );
    if (!ok) return;

    try {
      setProductsLoading(true);
      setProductsError(null);
      await request<{ ok: boolean }>(`/categories/${id}`, { method: "DELETE" });
      if (String(id) === selectedCategoryId) {
        setSelectedCategoryId("");
        setEditCategoryName("");
        setEditCategoryImage("");
      }
      await loadProducts();
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Failed to remove category.");
    } finally {
      setProductsLoading(false);
    }
  };

  const updateCategory = async () => {
    if (!selectedCategory) {
      setProductsError("Select a category to update.");
      return;
    }

    const nextName = editCategoryName.trim();
    if (!nextName) {
      setProductsError("Updated category name is required.");
      return;
    }

    const confirmMessage =
      `Update category #${selectedCategory.id} (${selectedCategory.name}) to \"${nextName}\"?\n\n` +
      `This will create a new category, move linked products, and remove the old category.`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      setProductsLoading(true);
      setProductsError(null);

      const createRes = await request<{ id: number }>("/categories", {
        method: "POST",
        body: JSON.stringify({
          name: nextName,
          image: editCategoryImage.trim() || null,
        }),
      });

      const linkedProducts = products.filter(
        (product) => Number(product.category_id) === selectedCategory.id
      );

      for (const product of linkedProducts) {
        await request<{ ok: boolean }>(`/products/${product.product_id}`, {
          method: "PUT",
          body: JSON.stringify({
            product_name: product.product_name,
            description: product.description || "",
            image: product.image || "",
            category_id: createRes.id,
            price_1kg: product.price_1kg ?? null,
            price_2kg: product.price_2kg ?? null,
            price_5kg: product.price_5kg ?? null,
            stock_qty: Math.max(0, Number(product.stock_qty || 0)),
            bestseller: Boolean(product.bestseller),
          }),
        });
      }

      await request<{ ok: boolean }>(`/categories/${selectedCategory.id}`, {
        method: "DELETE",
      });

      setSelectedCategoryId(String(createRes.id));
      await loadProducts();
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Failed to update category.");
    } finally {
      setProductsLoading(false);
    }
  };

  const checkSession = useCallback(async () => {
    try {
      setAuthChecking(true);
      const response = await fetch("/api/admin-session", { cache: "no-store" });
      const payload = (await response.json()) as { authenticated?: boolean };
      const authenticated = Boolean(payload?.authenticated);
      setIsAuthenticated(authenticated);
      if (!authenticated) {
        setOrders([]);
        setProducts([]);
        setCategories([]);
        setShippingConfig(getDefaultShippingConfig());
        setSelectedShippingLabel("");
        setShippingError(null);
        setShippingMessage(null);
      }
    } catch {
      setIsAuthenticated(false);
      setOrders([]);
      setProducts([]);
      setCategories([]);
      setShippingConfig(getDefaultShippingConfig());
      setSelectedShippingLabel("");
      setShippingError(null);
      setShippingMessage(null);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  const downloadFilteredOrdersDoc = useCallback(() => {
    const content = buildFilteredOrdersDocument(orders);
    const blob = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "filtered-orders-address-iteams.doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [orders]);

  const login = async () => {
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setAuthError("Enter username and password.");
      return;
    }

    try {
      setAuthError(null);
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername.trim(), password: adminPassword }),
      });

      if (!response.ok) {
        let message = "Login failed.";
        try {
          const payload = await response.json();
          message = payload?.detail || message;
        } catch {
          // no-op
        }
        setAuthError(message);
        return;
      }

      setAdminUsername("");
      setAdminPassword("");
      await checkSession();
    } catch {
      setAuthError("Login failed.");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin-logout", { method: "POST" });
    } finally {
      await checkSession();
    }
  };

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const initialLoad = async () => {
      try {
        setOrdersLoading(true);
        setProductsLoading(true);
        setOrdersError(null);
        setProductsError(null);

        const [ordersRes, productsRes, categoriesRes] = await Promise.all([
          request<OrderRow[]>("/orders?limit=400"),
          request<ProductRow[]>("/products"),
          request<CategoryRow[]>("/categories"),
        ]);

        setOrders(ordersRes);
        setProducts(productsRes);
        setCategories(categoriesRes);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load admin data.";
        setOrdersError(message);
        setProductsError(message);
      } finally {
        setOrdersLoading(false);
        setProductsLoading(false);
      }
    };

    void initialLoad();
  }, [isAuthenticated, request]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadDiscountSettings();
  }, [isAuthenticated, loadDiscountSettings]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadShippingSettings();
  }, [isAuthenticated, loadShippingSettings]);

  useEffect(() => {
    if (shippingConfig.slabs.length === 0) {
      if (selectedShippingLabel) {
        setSelectedShippingLabel("");
      }
      return;
    }

    const stillExists = shippingConfig.slabs.some(
      (slab) => slab.label === selectedShippingLabel
    );
    if (!stillExists) {
      setSelectedShippingLabel(shippingConfig.slabs[0].label);
    }
  }, [selectedShippingLabel, shippingConfig]);

  if (authChecking) {
    return (
      <div className="ua-admin">
        <section className="card section" style={{ maxWidth: 420, margin: "48px auto" }}>
          <h2 className="section-title">Checking admin session...</h2>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="ua-admin">
        <section className="card section" style={{ maxWidth: 420, margin: "48px auto" }}>
          <div className="section-head">
            <h2 className="section-title">Admin Login</h2>
            <span className="helper">Protected admin access</span>
          </div>
          <div className="field">
            <label>Username</label>
            <input
              value={adminUsername}
              onChange={(event) => setAdminUsername(event.target.value)}
              placeholder="Enter admin username"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Enter admin password"
            />
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={login}>
              Login
            </button>
          </div>
          {authError ? <p className="error">{authError}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="ua-admin">
      <header className="topbar">
        <div>
          <h1 className="title">Ulavapadu Mangoes Admin</h1>
          <p className="subtitle">Standalone admin panel powered by DB-backed admin API</p>
        </div>
        <div className="actions">
          <button className="btn btn-outline" onClick={loadOrders} disabled={ordersLoading}>
            {ordersLoading ? "Loading Orders..." : "Refresh Orders"}
          </button>
          <button className="btn btn-outline" onClick={loadProducts} disabled={productsLoading}>
            {productsLoading ? "Loading Products..." : "Refresh Products"}
          </button>
          <button className="btn btn-danger" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="card-grid">
        <div className="card metric">
          <div className="metric-label">Filtered Orders</div>
          <div className="metric-value">{orders.length}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">{money(orderRevenue)}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Shipped Amount</div>
          <div className="metric-value">{money(shippedRevenue)}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Delivered Amount</div>
          <div className="metric-value">{money(deliveredRevenue)}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Total Products</div>
          <div className="metric-value">{products.length}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Low Stock (≤ 5)</div>
          <div className="metric-value">{lowStockCount}</div>
        </div>
      </section>

      <section className="card section">
        <div className="section-head">
          <h2 className="section-title">1) Check Orders</h2>
          <span className="helper">Filter by date range and status</span>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="field">
            <label>To Date</label>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | "all")}>
              {orderStatusesApi.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Mobile Number</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter mobile number"
              value={phoneFilter}
              onChange={(event) => setPhoneFilter(event.target.value)}
            />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn btn-primary" onClick={loadOrders} disabled={ordersLoading}>
              {ordersLoading ? "Applying..." : "Apply Filter"}
            </button>
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button
              className="btn btn-outline"
              onClick={downloadFilteredOrdersDoc}
              type="button"
              disabled={orders.length === 0}
            >
              Download Filtered Word Document
            </button>
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Select Order</label>
            <select
              value={selectedOrderId}
              onChange={(event) => setSelectedOrderId(event.target.value)}
            >
              <option value="">Select order</option>
              {orders.map((order) => (
                <option key={order.order_id} value={order.order_id}>
                  #{order.order_id} | {order.customer_name || "-"} | {order.customer_phone || "-"}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Update Status</label>
            <select
              value={updatedOrderStatus}
              onChange={(event) =>
                setUpdatedOrderStatus(
                  event.target.value as "order confirmed" | "order shipped" | "order delivered"
                )
              }
            >
              <option value="order confirmed">order confirmed</option>
              <option value="order shipped">order shipped</option>
              <option value="order delivered">order delivered</option>
            </select>
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn btn-primary" onClick={updateOrderStatus} disabled={ordersLoading || !selectedOrderId}>
              {ordersLoading ? "Updating..." : "Update Order Status"}
            </button>
          </div>
        </div>

        {selectedOrder ? (
          <div className="card section" style={{ marginTop: 12, padding: 12 }}>
            <div className="section-head">
              <h3 className="section-title" style={{ fontSize: 16 }}>Selected Order #{selectedOrder.order_id}</h3>
              <span className={statusClass(String(selectedOrder.status || ""))}>{selectedOrder.status || "-"}</span>
            </div>
            <div className="helper">Address: {selectedOrder.address || "-"}</div>
            <div className="helper" style={{ marginTop: 6 }}>Items:</div>
            <ul style={{ marginTop: 4, marginBottom: 0 }}>
              {parseItems(selectedOrder.items).length > 0 ? (
                parseItems(selectedOrder.items).map((item, idx) => (
                  <li key={`${selectedOrder.order_id}-${idx}`}>
                    {item.product_name || "Item"} ({item.weight || "-"}) x {item.quantity || 0}
                  </li>
                ))
              ) : (
                <li>No items found</li>
              )}
            </ul>
          </div>
        ) : null}

        {ordersError ? <p className="error">{ordersError}</p> : null}

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Total</th>
                <th>Address</th>
                <th>Items</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>#{order.order_id}</td>
                    <td>{order.customer_name || "-"}</td>
                    <td>{order.customer_phone || "-"}</td>
                    <td>
                      <span className={statusClass(order.status)}>{order.status || "-"}</span>
                    </td>
                    <td>{money(Number(order.total_amount || 0))}</td>
                    <td>
                      <div style={{ whiteSpace: "pre-line" }}>
                        {`name :${order.customer_name || "-"}
                        Address:${order.address || "-"}
                        mobile:${order.customer_phone || "-"}`
                        }
                      </div>
                    </td>
                    <td>
                      {parseItems(order.items).length > 0
                        ? parseItems(order.items)
                            .map((item) => `${item.product_name || "Item"} (${item.weight || "-"}) x ${item.quantity || 0}`)
                            .join(", ")
                        : "No items"}
                    </td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>No orders found. Use filters and click Apply Filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card section">
        <div className="section-head">
          <h2 className="section-title">3) Discount Settings (Frontend)</h2>
          <span className="helper">Top strip + coupon codes for checkout</span>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Top Banner Enabled</label>
            <select
              value={discountBannerEnabled ? "true" : "false"}
              onChange={(event) => setDiscountBannerEnabled(event.target.value === "true")}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "span 3" }}>
            <label>Top Banner Message</label>
            <input
              value={discountBannerMessage}
              onChange={(event) => setDiscountBannerMessage(event.target.value)}
              placeholder="Use SUMMER code for 10% Discount"
            />
          </div>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Coupons</label>
          <div className="coupon-list">
            {couponRows.map((row, index) => (
              <div className="coupon-card" key={row.id}>
                <div className="coupon-grid">
                  <div className="field">
                    <label>Code</label>
                    <input
                      value={row.code}
                      onChange={(event) => updateCouponRow(row.id, "code", event.target.value.toUpperCase())}
                      placeholder="SUMMER"
                    />
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <select
                      value={row.type}
                      onChange={(event) => updateCouponRow(row.id, "type", event.target.value as "percent" | "flat")}
                    >
                      <option value="percent">percent</option>
                      <option value="flat">flat</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Value</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.value}
                      onChange={(event) => updateCouponRow(row.id, "value", event.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div className="field">
                    <label>Min Subtotal</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.minSubtotal}
                      onChange={(event) => updateCouponRow(row.id, "minSubtotal", event.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div className="field">
                    <label>Max Discount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.maxDiscount}
                      onChange={(event) => updateCouponRow(row.id, "maxDiscount", event.target.value)}
                      placeholder="300"
                    />
                  </div>
                  <div className="field">
                    <label>Active</label>
                    <select
                      value={row.active ? "true" : "false"}
                      onChange={(event) => updateCouponRow(row.id, "active", event.target.value === "true")}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </div>
                </div>
                <div className="actions" style={{ marginTop: 8 }}>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => removeCouponRow(row.id)}
                    disabled={couponRows.length <= 1 && !row.code && !row.value && !row.minSubtotal && !row.maxDiscount}
                  >
                    Remove Coupon
                  </button>
                  <span className="helper">Coupon #{index + 1}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="actions" style={{ marginTop: 10 }}>
            <button className="btn btn-outline" type="button" onClick={addCouponRow}>
              Add Coupon
            </button>
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={saveDiscountSettings}>Save Discount Settings</button>
          <button className="btn btn-outline" onClick={resetDiscountSettings}>Reset to Default Values</button>
        </div>

        {discountMessage ? <p className="helper" style={{ marginTop: 8 }}>{discountMessage}</p> : null}
      </section>

      <section className="card section">
        <div className="section-head">
          <h2 className="section-title">4) Shipping Rates</h2>
          <span className="helper">Choose a weight label and update rates for each delivery zone</span>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Select Weight Label</label>
            <select
              value={selectedShippingSlab?.label || ""}
              onChange={(event) => setSelectedShippingLabel(event.target.value)}
              disabled={shippingLoading || shippingConfig.slabs.length === 0}
            >
              {shippingConfig.slabs.map((slab) => (
                <option key={slab.label} value={slab.label}>
                  {slab.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Selected Range</label>
            <input value={selectedShippingSlab ? formatShippingRange(selectedShippingSlab) : ""} readOnly />
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: 12 }}>
          {shippingConfig.zones.map((zone) => (
            <div className="field" key={zone}>
              <label>{zone} Rate (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={selectedShippingSlab ? String(selectedShippingSlab.rates[zone] ?? 0) : ""}
                onChange={(event) => updateSelectedShippingRate(zone, event.target.value)}
                disabled={shippingLoading || !selectedShippingSlab}
              />
            </div>
          ))}
        </div>

        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={saveShippingSettings}
            disabled={shippingLoading || !selectedShippingSlab}
          >
            {shippingLoading ? "Saving Shipping Rates..." : "Save Shipping Rates"}
          </button>
        </div>

        <p className="helper" style={{ marginTop: 8 }}>
          Checkout reads these zone rates from the frontend runtime config.
        </p>
        {shippingMessage ? <p className="helper" style={{ marginTop: 8 }}>{shippingMessage}</p> : null}
        {shippingError ? <p className="error">{shippingError}</p> : null}
      </section>

      <section className="card section">
        <div className="section-head">
          <h2 className="section-title">5) Product Management</h2>
          <span className="helper">Edit prices, add/remove/update products, and add/remove/update categories</span>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Select Existing Product</label>
            <select
              value={selectedProductId}
              onChange={(event) => {
                const id = event.target.value;
                setSelectedProductId(id);
                const found = products.find((product) => String(product.product_id) === id);
                setEditPrice250(found ? String(Number(found.price_1kg || 0)) : "");
                setEditPrice500(found ? String(Number(found.price_2kg || 0)) : "");
                setEditPrice1000(found ? String(Number(found.price_5kg || 0)) : "");
                setEditStock(found ? String(Number(found.stock_qty || 0)) : "");
              }}
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.product_id} value={product.product_id}>
                  {product.product_name} (#{product.product_id})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Updated Price 1kg (₹)</label>
            <input value={editPrice250} onChange={(event) => setEditPrice250(event.target.value)} />
          </div>
          <div className="field">
            <label>Updated Price 2kg (₹)</label>
            <input value={editPrice500} onChange={(event) => setEditPrice500(event.target.value)} />
          </div>
          <div className="field">
            <label>Updated Price 5kg (₹)</label>
            <input value={editPrice1000} onChange={(event) => setEditPrice1000(event.target.value)} />
          </div>
          <div className="field">
            <label>Updated Stock</label>
            <input value={editStock} onChange={(event) => setEditStock(event.target.value)} />
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={updateProductPrices} disabled={productsLoading || !selectedProductId}>
            {productsLoading ? "Updating..." : "Update Product"}
          </button>
        </div>

        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Select Existing Category</label>
            <select
              value={selectedCategoryId}
              onChange={(event) => {
                const id = event.target.value;
                setSelectedCategoryId(id);
                const found = categories.find((category) => String(category.id) === id);
                setEditCategoryName(found ? found.name : "");
                setEditCategoryImage(found ? String(found.image || "") : "");
              }}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={`edit-cat-${category.id}`} value={category.id}>
                  {category.name} (#{category.id})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Updated Category Name</label>
            <input
              value={editCategoryName}
              onChange={(event) => setEditCategoryName(event.target.value)}
              placeholder="Ex: Fresh Mangoes"
            />
          </div>
          <div className="field">
            <label>Updated Category Image URL</label>
            <input
              value={editCategoryImage}
              onChange={(event) => setEditCategoryImage(event.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button
              className="btn btn-primary"
              onClick={updateCategory}
              disabled={productsLoading || !selectedCategoryId}
            >
              {productsLoading ? "Updating Category..." : "Update Category"}
            </button>
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>New Category Name</label>
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Ex: Pickles"
            />
          </div>
          <div className="field">
            <label>Category Image URL (optional)</label>
            <input
              value={newCategoryImage}
              onChange={(event) => setNewCategoryImage(event.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-outline" onClick={addCategory} disabled={productsLoading}>
            {productsLoading ? "Saving Category..." : "Add Category"}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (!selectedCategory) {
                setProductsError("Select a category to remove.");
                return;
              }
              void removeCategory(selectedCategory.id, selectedCategory.name);
            }}
            disabled={productsLoading || !selectedCategoryId}
          >
            Remove Selected Category
          </button>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Product Name</label>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex: Murukku" />
          </div>
          <div className="field">
            <label>Image URL</label>
            <input value={newImage} onChange={(event) => setNewImage(event.target.value)} placeholder="https://..." />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={newCategoryId} onChange={(event) => setNewCategoryId(event.target.value)}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} (#{category.id})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Stock</label>
            <input value={newStock} onChange={(event) => setNewStock(event.target.value)} placeholder="Ex: 25" />
          </div>
          <div className="field">
            <label>Price 1kg (₹)</label>
            <input value={newPrice250} onChange={(event) => setNewPrice250(event.target.value)} placeholder="Ex: 149" />
          </div>
          <div className="field">
            <label>Price 2kg (₹)</label>
            <input value={newPrice500} onChange={(event) => setNewPrice500(event.target.value)} placeholder="Ex: 299" />
          </div>
          <div className="field">
            <label>Price 5kg (₹)</label>
            <input value={newPrice1000} onChange={(event) => setNewPrice1000(event.target.value)} placeholder="Ex: 599" />
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={addProduct} disabled={productsLoading}>
            {productsLoading ? "Saving..." : "Add Product"}
          </button>
        </div>

        {productsError ? <p className="error">{productsError}</p> : null}

        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Filter by Category</label>
            <select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              <option value="none">No category</option>
              {categories.map((category) => (
                <option key={`filter-${category.id}`} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>1kg</th>
                <th>2kg</th>
                <th>5kg</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.product_id}>
                    <td>#{product.product_id}</td>
                    <td>{product.product_name}</td>
                    <td>{product.category_name || "-"}</td>
                    <td>{money(Number(product.price_1kg || 0))}</td>
                    <td>{money(Number(product.price_2kg || 0))}</td>
                    <td>{money(Number(product.price_5kg || 0))}</td>
                    <td>{Number(product.stock_qty || 0)}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => removeProduct(product.product_id, product.product_name)}
                        disabled={productsLoading}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>No products found for selected category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
