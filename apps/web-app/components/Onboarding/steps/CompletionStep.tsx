import { Check } from "lucide-react";
import { Button } from "@ui/components/core/button";

interface CompletionStepProps {
    onComplete: () => void;
}

export const CompletionStep = ({ onComplete }: CompletionStepProps) => {
    return (
        <div className="space-y-4 text-center">
            <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-500" />
                </div>
            </div>
            <h2 className="text-xl font-bold">Výborně!</h2>
            <p className="text-sm text-gray-500">
                Tvá registrace je dokončena. Můžeš začít hledat práci!
            </p>
            <Button onClick={onComplete} className="w-full uppercase">
                Začít hledat práci
            </Button>
        </div>
    );
};


