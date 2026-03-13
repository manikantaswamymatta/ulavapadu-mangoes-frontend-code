import config from "@/src/data/config.json";

export const DISCOUNT_STORAGE_KEY = "ua-discount-config-v1";

export type CouponType = "percent" | "flat";

export type CouponRule = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal?: number;
  maxDiscount?: number;
  active?: boolean;
};

export type DiscountConfig = {
  banner: {
    enabled: boolean;
    message: string;
  };
  coupons: CouponRule[];
};

const defaultDiscountConfig: DiscountConfig = {
  banner: {
    enabled: Boolean((config as any)?.discounts?.banner?.enabled),
    message: String((config as any)?.discounts?.banner?.message || ""),
  },
  coupons: Array.isArray((config as any)?.discounts?.coupons)
    ? ((config as any).discounts.coupons as CouponRule[])
    : [],
};

export function getDefaultDiscountConfig(): DiscountConfig {
  return JSON.parse(JSON.stringify(defaultDiscountConfig));
}

export function loadDiscountConfig(): DiscountConfig {
  if (typeof window === "undefined") {
    return getDefaultDiscountConfig();
  }

  try {
    const raw = window.localStorage.getItem(DISCOUNT_STORAGE_KEY);
    if (!raw) return getDefaultDiscountConfig();
    const parsed = JSON.parse(raw);

    const banner = parsed?.banner || {};
    const coupons = Array.isArray(parsed?.coupons) ? parsed.coupons : [];

    return {
      banner: {
        enabled: typeof banner.enabled === "boolean" ? banner.enabled : defaultDiscountConfig.banner.enabled,
        message: typeof banner.message === "string" ? banner.message : defaultDiscountConfig.banner.message,
      },
      coupons,
    };
  } catch {
    return getDefaultDiscountConfig();
  }
}

export function saveDiscountConfig(nextConfig: DiscountConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(nextConfig));
  window.dispatchEvent(new Event("discount-config-updated"));
}

export function calculateCouponDiscount(subtotal: number, coupon: CouponRule): number {
  if (coupon.active === false) return 0;
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) return 0;

  let discount = 0;
  if (coupon.type === "percent") {
    discount = (subtotal * coupon.value) / 100;
  } else {
    discount = coupon.value;
  }

  if (coupon.maxDiscount && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }

  return Math.max(0, Math.min(discount, subtotal));
}
