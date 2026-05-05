import { Camera } from "lucide-react";
import { Button } from "@ui/components/core/button";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/core/avatar";

interface AvatarUploadProps {
    avatarPreview: string | null;
    isLoading: boolean;
    onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
    description?: string;
    buttonLabel?: string;
    size?: "sm" | "md" | "lg";
}

const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-40 h-40",
};

export const AvatarUpload = ({
    avatarPreview,
    isLoading,
    onAvatarChange,
    onSave,
    description = "Dobrý obrázek ti pomůže najít práci",
    buttonLabel = "Uložit",
    size = "md",
}: AvatarUploadProps) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-center">
                <label htmlFor="avatar-upload" className="cursor-pointer relative">
                    <Avatar className={sizeClasses[size]}>
                        <AvatarImage src={avatarPreview || undefined} alt="Avatar" />
                        <AvatarFallback>
                            <Camera className={`${size === "sm" ? "w-5 h-5" : size === "md" ? "w-8 h-8" : "w-10 h-10"} text-gray-400`} />
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
            {description && (
                <p className="text-sm text-gray-500 text-center">{description}</p>
            )}
            <Button
                onClick={onSave}
                className="w-full uppercase"
                disabled={isLoading}
            >
                {isLoading ? "Nahrávám..." : buttonLabel}
            </Button>
        </div>
    );
};


