"use client";

import { useEffect } from "react";
import { NavigationLink } from "@ui/components/core/navigation-link";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "@ui/components/core/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex flex-col items-center justify-center flex-1 gap-4 px-4 pt-36 pb-8">
        <h1 className="text-6xl font-bold">500</h1>
        <h2 className="text-2xl font-semibold">Něco se pokazilo</h2>
        <p className="text-lg text-muted-foreground text-center max-w-md">
          Došlo k neočekávané chybě při načítání stránky.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Button onClick={reset} variant="default" size="lg" className="text-white">
            Zkusit znovu
          </Button>
          <NavigationLink href="/">
            <Button variant="outline" size="lg">
              Zpět na hlavní stránku
            </Button>
          </NavigationLink>
        </div>
      </main>
      <Footer />
    </div>
  );
}
