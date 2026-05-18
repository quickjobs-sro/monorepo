"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="cs">
            <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1rem", padding: "2rem", textAlign: "center" }}>
                    <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16a34a" }}>Quick<span style={{ color: "#111827" }}>JOBS</span></span>
                    </a>
                    <h1 style={{ fontSize: "4rem", fontWeight: 700, margin: 0, color: "#111827" }}>500</h1>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0, color: "#111827" }}>Něco se pokazilo</h2>
                    <p style={{ color: "#6b7280", maxWidth: "28rem", margin: 0 }}>
                        Došlo k neočekávané chybě. Naši vývojáři byli upozorněni.
                    </p>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
                        <button
                            onClick={reset}
                            style={{ padding: "0.625rem 1.5rem", background: "#16a34a", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer", fontSize: "1rem" }}
                        >
                            Zkusit znovu
                        </button>
                        <a
                            href="/"
                            style={{ padding: "0.625rem 1.5rem", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontWeight: 600, textDecoration: "none", fontSize: "1rem" }}
                        >
                            Zpět na hlavní stránku
                        </a>
                    </div>
                </div>
            </body>
        </html>
    );
}
