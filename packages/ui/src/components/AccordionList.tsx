import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./core/accordion";

interface AccordionItem {
  title: string;
  children: React.ReactNode;
}

interface AccordionListProps {
  accordionList: AccordionItem[];
}

export const AccordionList = ({ accordionList }: AccordionListProps) => {
  return (
    <Accordion type="single" collapsible className="w-full">
      {accordionList.map(({ title, children }, index) => (
        <AccordionItem key={index} value={`item-${index}`} className="border-b">
          <AccordionTrigger className="text-lg font-semibold text-gray-900 py-4">
            {title}
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 pb-4">
            {children}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
