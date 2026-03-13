"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div>
        <h2 style={{ marginBottom: 10 }}>Something went wrong</h2>
        <p style={{ marginBottom: 16 }}>Please try again. If the issue continues, refresh once.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "none",
            background: "#8b1e1e",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
