import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalDetailsSchema, PersonalDetailsForm } from "../helpers/onboardingHelpers";

export const useOnboardingForm = (userProfile: any) => {
    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors, isValid },
    } = useForm<PersonalDetailsForm>({
        resolver: zodResolver(personalDetailsSchema),
        mode: "onBlur",
        defaultValues: {
            givenName: "",
            familyName: "",
            email: "",
            birthDate: undefined,
            gender: undefined,
            userSource: "",
        },
    });

    // Update form values when user profile loads
    useEffect(() => {
        if (userProfile?.data) {
            const user = userProfile.data;
            if (user.givenName) setValue("givenName", user.givenName);
            if (user.familyName) setValue("familyName", user.familyName);
            if (user.email) setValue("email", user.email);
            if (user.birthDate) setValue("birthDate", new Date(user.birthDate));
            if (user.gender) setValue("gender", user.gender as "male" | "female");
        }
    }, [userProfile, setValue]);

    return {
        control,
        handleSubmit,
        errors,
        isValid,
    };
};


