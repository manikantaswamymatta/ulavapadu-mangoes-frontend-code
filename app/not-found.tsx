import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          border: "1px solid #efefef",
          borderRadius: "16px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "2rem" }}>404 - Page not found</h2>
        <p style={{ color: "#666", margin: "10px 0 20px" }}>
          This page is unavailable. Try going back to home or menu.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Link
            href="/"
            style={{
              padding: "10px 18px",
              backgroundColor: "#5a371e",
              color: "white",
              textDecoration: "none",
              borderRadius: "10px",
              fontWeight: "700",
            }}
          >
            Go Home
          </Link>
          <Link
            href="/products"
            style={{
              padding: "10px 18px",
              border: "1px solid #5a371e",
              color: "#5a371e",
              textDecoration: "none",
              borderRadius: "10px",
              fontWeight: "700",
            }}
          >
            Browse Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
