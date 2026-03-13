import "./globals.css";
import "./HomePage.css";
import "./MangoCommerceHome.css";
import "./products/ProductsClient.css";
import Header from "@/src/components/Header";
import FloatingCartButton from "@/src/components/FloatingCartButton";
import FloatingWhatsAppButton from "@/src/components/FloatingWhatsAppButton";
import MobileBottomNav from "@/src/components/MobileBottomNav";
import { CartProvider } from "@/src/context/CartContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ulavapadu Mangoes",
  description: "Fresh and organic mangoes directly from farm to your home. Home delivery available across India.",
  icons: {
    icon: "/ulavapadumangoes-logo-v2.png",
    shortcut: "/ulavapadumangoes-logo-v2.png",
    apple: "/ulavapadumangoes-logo-v2.png",
  },
};

export const viewport = "width=device-width, initial-scale=1";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header />
          {children}
          <MobileBottomNav />
          <FloatingWhatsAppButton />
          <FloatingCartButton />
        </CartProvider>
      </body>
    </html>
  );
}
