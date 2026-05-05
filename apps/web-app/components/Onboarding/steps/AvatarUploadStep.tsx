import { Camera } from "lucide-react";
import { Button } from "@ui/components/core/button";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/core/avatar";

interface AvatarUploadStepProps {
    avatarPreview: string | null;
    isLoading: boolean;
    onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onContinue: () => void;
}

export const AvatarUploadStep = ({
    avatarPreview,
    isLoading,
    onAvatarChange,
    onContinue,
}: AvatarUploadStepProps) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-center">
                <label htmlFor="avatar-upload" className="cursor-pointer relative">
                    <Avatar className="w-32 h-32">
                        <AvatarImage src={avatarPreview || undefined} alt="Avatar" />
                        <AvatarFallback>
                            <Camera className="w-8 h-8 text-gray-400" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-2">
                        <Camera className="w-4 h-4 text-white" />
                    </div>
                    <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onAvatarChange}
                    />
                </label>
            </div>
            <p className="text-sm text-gray-500 text-center">
                Dobrý obrázek ti pomůže najít práci
            </p>
            <Button
                onClick={onContinue}
                className="w-full uppercase"
                disabled={isLoading}
            >
                {isLoading ? "Nahrávám..." : "Pokračovat"}
            </Button>
        </div>
    );
};


