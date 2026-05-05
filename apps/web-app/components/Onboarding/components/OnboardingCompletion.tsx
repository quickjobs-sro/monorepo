import { Check } from "lucide-react";
import { Button } from "@ui/components/core/button";

interface OnboardingCompletionProps {
    onComplete: () => void;
    title?: string;
    description?: string;
    buttonLabel?: string;
}

export const OnboardingCompletion = ({
    onComplete,
    title = "Výborně!",
    description = "Tvá registrace je dokončena. Můžeš začít hledat práci!",
    buttonLabel = "Začít hledat práci",
}: OnboardingCompletionProps) => {
    return (
        <div className="space-y-4 text-center">
            <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-500" />
                </div>
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
            <Button onClick={onComplete} className="w-full uppercase">
                {buttonLabel}
            </Button>
        </div>
    );
};


