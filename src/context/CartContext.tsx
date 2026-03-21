"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  id: string;
  product_id: number;
  name: string;
  image: string;
  price: number;
  weight: string;
  quantity: number;
  category: string;
  stock_qty?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "quantity">) => boolean;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = "ulavapadu-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) {
      setHasLoadedFromStorage(true);
      return;
    }
    try {
      const parsedCart = JSON.parse(savedCart);
      if (!Array.isArray(parsedCart)) {
        setHasLoadedFromStorage(true);
        return;
      }
      const validItems = parsedCart.filter(
        (item) =>
          typeof item?.product_id === "number" &&
          Number.isFinite(item.product_id) &&
          typeof item?.name === "string" &&
          typeof item?.price === "number" &&
          typeof item?.quantity === "number"
      );
      setItems(validItems);
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {
      setHasLoadedFromStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedFromStorage) {
      return;
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hasLoadedFromStorage]);

  const addToCart = (item: Omit<CartItem, "id" | "quantity"> & { product_id: number }) => {
    let added = false;

    setItems((prevItems) => {
      const availableStock = Number(item.stock_qty ?? Number.POSITIVE_INFINITY);
      if (Number.isFinite(availableStock) && availableStock <= 0) {
        return prevItems;
      }

      const existingItem = prevItems.find(
        (cartItem) => cartItem.product_id === item.product_id && cartItem.weight === item.weight
      );

      if (existingItem) {
        const existingStock = Number(existingItem.stock_qty ?? availableStock);
        if (Number.isFinite(existingStock) && existingItem.quantity >= existingStock) {
          return prevItems;
        }

        added = true;
        return prevItems.map((cartItem) =>
          cartItem.product_id === item.product_id && cartItem.weight === item.weight
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      const newItem: CartItem = {
        ...item,
        id: `${item.product_id}-${item.weight}-${Date.now()}`,
        product_id: item.product_id,
        quantity: 1,
      };

      added = true;
      return [...prevItems, newItem];
    });

    return added;
  };

  const removeFromCart = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;
        const stockLimit = Number(item.stock_qty ?? Number.POSITIVE_INFINITY);
        if (Number.isFinite(stockLimit)) {
          return { ...item, quantity: Math.min(quantity, Math.max(0, stockLimit)) };
        }
        return { ...item, quantity };
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
