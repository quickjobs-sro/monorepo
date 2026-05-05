import Link from "next/link";

export default function NotFound() {
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
            <h1 style={{ fontSize: "3rem", fontWeight: 700, marginBottom: "1rem" }}>404</h1>
            <p style={{ fontSize: "1.25rem", marginBottom: "2rem" }}>
                Stránka nenalezena
            </p>
            <p
                style={{
                    fontSize: "1rem",
                    marginBottom: "2rem",
                    color: "var(--muted-foreground, #666)",
                }}
            >
                Požadovaná stránka neexistuje.
            </p>
            <Link href="/">
                <span
                    style={{
                        display: "inline-block",
                        padding: "0.75rem 1.5rem",
                        background: "#222",
                        color: "#fff",
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
    );
}
