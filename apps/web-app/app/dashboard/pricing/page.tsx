import { AccordionList } from "@ui/components/AccordionList";
import { Skeleton } from "@ui/components/core/skeleton";
import { Suspense } from "react";
import CustomerSupport from "../../../components/CustomerSuport";
import { PricingFeatures } from "../../../components/PricingFeatures";

const FAQ_LIST = [
  {
    title: "Jak mohu zakoupit inzeráty pro více uživatelů?",
    children: (
      <p>
        Pokud máte zájem o inzeráty pro více uživatelů, napište nám na{" "}
        <a href="mailto:podpora@quickjobs.cz" className="text-green-500">
          podpora@quickjobs.cz
        </a>
      </p>
    ),
  },
  {
    title: "Jakými způsoby mohu zaplatit za vaši službu?",
    children: (
      <p>
        Lze platit kartou nebo převodem. Při platbě kartou získáte inzeráty
        ihned k využití, při platbě převodem vám přidělíme inzeráty po uhrazení
        faktury.
      </p>
    ),
  },
  {
    title: "Převádí se mi nepoužité inzeráty na další rok?",
    children: (
      <p>
        Nevyužité inzeráty se nepřevádí. Platnost zakoupených inzerátů je 365
        dní od zakoupení.
      </p>
    ),
  },
];

export default function Page(): JSX.Element {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 my-20">
      <h2 className="text-center text-5xl text-gray-500">Ceník</h2>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <PricingFeatures />
      </Suspense>

      <div className="w-full max-w-6xl mx-auto space-y-10 ">
        <h2 className="text-center text-3xl text-gray-500 mt-20">
          Časté dotazy ohledně ceníku
        </h2>
        <AccordionList accordionList={FAQ_LIST} />
      </div>
      <CustomerSupport />
    </div>
  );
}
