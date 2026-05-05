import { HistoryJobItem } from "@webapp/components/MyJobs/HistoryJobItem";
import { ReviewFeature } from "@webapp/components/reviews/ReviewFeature";

export default function Page(): JSX.Element {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 my-20">
      <h2 className="text-center text-5xl text-gray-500">Hodnocení uchazečů</h2>
      <ReviewFeature />
    </div>
  );
}
