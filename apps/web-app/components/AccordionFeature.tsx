import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "ui/components/core/accordion";

const ACCORDION_ITEMS = [
  {
    value: "item-1",
    trigger: "Kolik využívání aplikace stojí?",
    content: (
      <>
        Služba je zpoplatněna dle{" "}
        <a href="/dashboard/pricing" className="text-blue-600 underline">
          ceníku
        </a>
        .
      </>
    ),
  },
  {
    value: "item-2",
    trigger: "Mohou aplikaci využívat i pracovní agentury?",
    content:
      "Ano, samozřejmě, naším cílem je propojit zaměstnavatele s uchazeči napříč celou Českou republikou.",
  },
  {
    value: "item-3",
    trigger: "Jaký je rozdíl mezi jednorázovou a dlouhodobou brigádou?",
    content: (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">Jednorázové brigády</h3>
          <ul className="list-disc list-inside text-gray-700">
            <li>
              Brigáda typicky na <strong>1 den nebo jen několik hodin.</strong>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Dlouhodobé brigády</h3>
          <ul className="list-disc list-inside text-gray-700">
            <li>
              Brigáda na <strong>2 a více dní nebo opakovaně.</strong>
            </li>
            <li>Navíc sekce na požadavky a co nabízíte</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    value: "item-4",
    trigger: "Jak funguje proces hodnocení?",
    content:
      'Uchazeče můžete hodnotit od chvíle, kdy mu přiřadíte nějaký status (mimo "nezajímá mě"). Od této chvíle mohou hodnotit také uchazeči vás.',
  },
  {
    value: "item-5",
    trigger: "V čem je QuickJOBS lepší než jiné služby?",
    content:
      "Hlavní výhodou aplikace je její jednoduchost a rychlost při hledání brigádníků či zaměstnanců. Vystavením inzerátů okamžitě oslovíte tisíce uživatelů a poté máte možnost uchazečům zavolat a dále se s nimi domluvit.",
  },
];

export const AccordionFeature = () => {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <Accordion type="single" collapsible className="w-full ">
        {ACCORDION_ITEMS.map(({ value, trigger, content }) => (
          <AccordionItem key={value} value={value} className="border-b">
            <AccordionTrigger className="text-lg font-semibold text-gray-900 py-4">
              {trigger}
            </AccordionTrigger>
            <AccordionContent className="text-gray-700 pb-4">
              {content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
