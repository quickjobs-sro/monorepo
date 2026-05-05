import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import API, { NOTIFICATION_TRIGGER, NOTIFICATION_CHANNEL } from "quickjobs-api-wrapper";
import { useToast } from "@ui/hooks/use-toast";
import { API_KEYS } from "@ui/types/api_keys";
import { PersonalDetailsForm } from "../helpers/onboardingHelpers";

export const useOnboardingActions = (
    refetchProfile: () => void,
    onStepChange?: (step: number) => void
) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    const updatePersonalDetails = async (data: PersonalDetailsForm) => {
        setIsLoading(true);
        try {
            await API.users.updateProfile({
                email: data.email,
                givenName: data.givenName,
                familyName: data.familyName,
                gender: data.gender,
                birthDate: format(data.birthDate, "yyyy-MM-dd"),
                user_source: data.userSource,
                roles: ["candidate"],
                subscribedNotifications: {
                    [NOTIFICATION_TRIGGER.NEW_FULL_TIME_JOBS]: [NOTIFICATION_CHANNEL.PHONE],
                    [NOTIFICATION_TRIGGER.NEW_LONG_TERM_JOBS]: [NOTIFICATION_CHANNEL.PHONE],
                    [NOTIFICATION_TRIGGER.NEW_ONE_TIME_JOBS]: [NOTIFICATION_CHANNEL.PHONE],
                },
            });

            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            await refetchProfile();
            onStepChange?.(2);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se uložit údaje. Zkus to prosím znovu.",
                variant: "destructive",
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const uploadAvatar = async (file: File | null) => {
        if (!file) {
            onStepChange?.(3);
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);

            await API.users.updateImage(formData, "avatar");

            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            await refetchProfile();
            onStepChange?.(3);
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se nahrát obrázek. Zkus to prosím znovu.",
                variant: "destructive",
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const setupLocation = async (
        defaultLocation: { latitude: number; longitude: number; address: string },
        userProfile: any
    ) => {
        setIsLoading(true);
        try {
            const user = userProfile?.data;
            const hasLocation = user?.areas && user.areas.length > 0;

            if (!hasLocation) {
                await API.users.addArea({
                    active: true,
                    radius: 25000,
                    place: {
                        latitude: defaultLocation.latitude,
                        longitude: defaultLocation.longitude,
                        address: defaultLocation.address,
                    },
                });
            }

            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            await refetchProfile();
            onStepChange?.(5);
        } catch (error) {
            console.error("Error setting up location:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se nastavit lokaci. Zkus to prosím znovu.",
                variant: "destructive",
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const removeSchool = async (schoolId: number, refetchProfile: () => void) => {
        try {
            await API.schools.removeUserSchool({
                user_school_id: schoolId,
            });
            await refetchProfile();
        } catch (error) {
            console.error("Error removing school:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se odstranit školu.",
                variant: "destructive",
            });
            throw error;
        }
    };

    return {
        isLoading,
        updatePersonalDetails,
        uploadAvatar,
        setupLocation,
        removeSchool,
    };
};


