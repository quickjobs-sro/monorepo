import { Button } from "@ui/components/core/button";

interface LocationStepProps {
    locationAddress: string;
    isLoading: boolean;
    onSetup: () => void;
}

export const LocationStep = ({
    locationAddress,
    isLoading,
    onSetup,
}: LocationStepProps) => {
    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
                Nastavíme ti výchozí lokaci ({locationAddress}). Můžeš ji později změnit v
                nastavení.
            </p>
            <Button
                onClick={onSetup}
                className="w-full uppercase"
                disabled={isLoading}
            >
                {isLoading ? "Nastavuji..." : "Nastavit lokaci"}
            </Button>
        </div>
    );
};


