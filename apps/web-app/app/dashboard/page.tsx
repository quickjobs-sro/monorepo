import { ScrollArea } from "@ui/components/core/scroll-area";
import { AccordionFeature } from "../../components/AccordionFeature";
import CustomerSupport from "../../components/CustomerSuport";
import { JobPostingGuide } from "../../components/JobPostingGuide";

export default function Page(): JSX.Element {
  return (
    <ScrollArea className="w-screen h-screen">
      <div className="flex flex-col items-center justify-center w-screen pb-[100px]">
        <JobPostingGuide />
        <AccordionFeature />
        <CustomerSupport />
      </div>
    </ScrollArea>
  );
}
