import { Button } from "@ui/components/core/button";

interface LocationSetupProps {
    locationAddress: string;
    isLoading: boolean;
    onSetup: () => void;
    description?: string;
    buttonLabel?: string;
}

export const LocationSetup = ({
    locationAddress,
    isLoading,
    onSetup,
    description,
    buttonLabel = "Nastavit lokaci",
}: LocationSetupProps) => {
    const defaultDescription = `Nastavíme ti výchozí lokaci (${locationAddress}). Můžeš ji později změnit v nastavení.`;

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
                {description || defaultDescription}
            </p>
            <Button
                onClick={onSetup}
                className="w-full uppercase"
                disabled={isLoading}
            >
                {isLoading ? "Nastavuji..." : buttonLabel}
            </Button>
        </div>
    );
};


