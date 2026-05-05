import { NavigationLink } from "@ui/components/core/navigation-link";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "@ui/components/core/button";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex flex-col items-center justify-center flex-1 gap-4 px-4 py-36">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-semibold">Stránka nenalezena</h2>
        <p className="text-lg text-muted-foreground text-center max-w-md">
          Požadovaná stránka neexistuje.
        </p>
        <NavigationLink href="/">
          <Button variant="default" size="lg" className="text-white">
            Zpět na hlavní stránku
          </Button>
        </NavigationLink>
      </main>
      <Footer />
    </div>
  );
}
