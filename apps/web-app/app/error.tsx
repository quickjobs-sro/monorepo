"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error Boundary Component
 * 
 * This handles React runtime errors (component crashes, unhandled exceptions).
 * It does NOT handle HTTP status codes - those should be handled in components/middleware.
 * 
 * For 404 errors, use notFound() function which triggers not-found.tsx
 * For 401/403 errors, handle in components/middleware (redirect to login)
 * For API errors, handle in the component making the request
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background, #f9fafb)",
        color: "var(--foreground, #222)",
        fontFamily: "inherit",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "3rem", fontWeight: 700, marginBottom: "1rem" }}>500</h1>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
        Něco se pokazilo
      </h2>
      <p
        style={{
          fontSize: "1.25rem",
          marginBottom: "2rem",
          color: "var(--muted-foreground, #666)",
        }}
      >
        Došlo k neočekávané chybě při načítání stránky.
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#222",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#333")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#222")}
          onFocus={(e) => (e.currentTarget.style.outline = "2px solid #666")}
          onBlur={(e) => (e.currentTarget.style.outline = "none")}
        >
          Zkusit znovu
        </button>
        <Link href="/">
          <span
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              background: "transparent",
              color: "#222",
              border: "1px solid #222",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 500,
              transition: "background 0.2s",
              cursor: "pointer",
            }}
          >
            Zpět na hlavní stránku
          </span>
        </Link>
      </div>
    </div>
  );
}
