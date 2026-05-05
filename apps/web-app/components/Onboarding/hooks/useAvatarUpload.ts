import { useState, ChangeEvent } from "react";

export const useAvatarUpload = (existingAvatarUrl?: string) => {
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const avatarUrl = avatarPreview || existingAvatarUrl || null;

    return {
        avatarFile,
        avatarPreview: avatarUrl,
        handleAvatarChange,
    };
};


