import ProductsClient from "./ProductsClient";
import { Suspense } from "react";

export const metadata = {
  title: "Products | Ulavapadu Mangoes",
  description: "Explore premium mango varieties and mango products.",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading products...</div>}>
      <ProductsClient />
    </Suspense>
  );
}
