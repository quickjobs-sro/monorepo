import { z } from "zod";
import { differenceInYears } from "date-fns";

export const personalDetailsSchema = z.object({
    givenName: z.string().min(1, "Jméno je povinné"),
    familyName: z.string().min(1, "Příjmení je povinné"),
    email: z.string().email("Neplatný e-mail").min(1, "E-mail je povinný"),
    birthDate: z.date({
        required_error: "Datum narození je povinné",
    }).refine((date) => {
        const age = differenceInYears(new Date(), date);
        return age >= 15;
    }, "Musíš být starší 15 let"),
    gender: z.enum(["male", "female"], {
        required_error: "Pohlaví je povinné",
    }),
    userSource: z.string().min(1, "Odkud ses o QuickJOBS dozvěděl/a?"),
});

export type PersonalDetailsForm = z.infer<typeof personalDetailsSchema>;

export const getStepTitle = (step: number): string => {
    const titles: Record<number, string> = {
        1: "Vyplň údaje",
        2: "Profilový obrázek",
        3: "Kde studuješ?",
        4: "Lokace",
        5: "Výborně!",
    };
    return titles[step] || "";
};

export const getStepDescription = (step: number): string => {
    const descriptions: Record<number, string> = {
        1: "aby se s tebou mohli zaměstnavatelé spojit",
        2: "Nahraj si profilový obrázek",
        3: "Přidej školu, kde studuješ",
        4: "Nastav si lokaci pro hledání práce",
        5: "Registrace dokončena!",
    };
    return descriptions[step] || "";
};

export const detectOnboardingStep = (userProfile: any): number => {
    if (!userProfile?.data) return 0;

    const user = userProfile.data;
    const hasEmail = user.email && user.email.length > 0;
    const hasAvatar = user.avatarImage && user.avatarImage.url?.length > 0;
    const hasSchools = user.userSchools && user.userSchools.length > 0;
    const hasLocation = user.areas && user.areas.length > 0;

    if (!hasEmail) return 1;
    if (!hasAvatar) return 2;
    if (!hasSchools) return 3;
    if (!hasLocation) return 4;
    return 5;
};


