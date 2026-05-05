"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { Loader } from "lucide-react";
import API from "quickjobs-api-wrapper";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "../hooks/use-toast";
import { API_KEYS } from "../types/api_keys";
import { Button } from "./core/button";
import { Card, CardContent, CardHeader } from "./core/card";
import { Input } from "./core/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./core/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "./core/select";
import { Toaster } from "./core/toaster";

const LINK_APP_DOWNLOAD = "https://quickjobscz.app.link/website_z_cta_na_u";
const LINK_PRIVACY_POLICY = "https://www.quickjobs.cz/ochrana-osobnich-udaju";
const LINK_TERM_OF_TRADE =
  "https://quickjobs.cz/obchodni-podminky?_gl=1*n4ni7h*_gcl_au*MzE3NTUzOTUxLjE3Mzg1MjE1MTk.*_ga*MTkyMTk4MTIxNC4xNzM4Mjc2OTg4*_ga_6N0H7F4RH7*MTczODUyNzQ3Ny4yLjEuMTczODUyNzcwOS4wLjAuMA..*_ga_Q1272S8FZN*MTczODUyNzQ3Ny4yLjEuMTczODUyNzcwOS42MC4wLjA.";
const defaultCountryCode = "+420";

const phoneSchema = z.object({
  phone: z
    .string()
    .min(9, "Neplatné telefonní číslo")
    .max(15, "Neplatné telefonní číslo"),
  countryCode: z.string().min(1, "Musíte vybrat kód země"),
});

const registrationSchema = z.object({
  givenName: z.string().min(1, "Jméno je povinné"),
  familyName: z.string().min(1, "Příjmení nebo název společnosti je povinné"),
  email: z.string().email("Neplatný e-mail").min(1, "E-mail je povinný"),
  howDidYouHearAboutUs: z.string().min(1, "Jak jste se o nás dozvěděli?"),
});

type PhoneFormType = {
  phone: string;
  countryCode: string;
};

type RegistrationFormType = z.infer<typeof registrationSchema>;

type LoginCardType = {
  callback: () => void;
  isLoading?: boolean;
};

export const LoginCard = ({ callback, isLoading }: LoginCardType) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const urlParams = new URLSearchParams(window.location.search);
    const token = Cookies.get("QuickJobs.tokens");
    if (token && urlParams.get("forceRegistration") === "true") {
      try {
        // Restore token to API wrapper for profile update
        const parsedToken = JSON.parse(token);
        API.restoreUserToken(parsedToken);
        setStep(2);
      } catch (error) {
        console.error("Error restoring token for forced registration:", error);
        // If token is invalid, clear it and stay at step 0
        Cookies.remove("QuickJobs.tokens");
      }
    }
  }, []);

  const {
    control: phoneControl,
    handleSubmit: handlePhoneSubmit,
    setValue: setPhoneValue,
    formState: { errors: phoneErrors },
  } = useForm<PhoneFormType>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "", countryCode: defaultCountryCode },
  });

  const {
    control: registrationControl,
    handleSubmit: handleRegistrationSubmit,
    formState: { errors: registrationErrors },
  } = useForm<RegistrationFormType>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      givenName: "",
      familyName: "",
      email: "",
      howDidYouHearAboutUs: "",
    },
  });

  const handleSendCode = async (data: PhoneFormType) => {
    setLoading(true);
    try {
      const response = await API.authorization.sendVerification(
        `${data.countryCode}${data.phone}`
      );
      setIsNewUser(!response.userExists);
      setStep(1);
    } catch {
      toast({
        title: "Chyba",
        description: "Nepodařilo se odeslat SMS. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (verificationCode: string) => {
    setLoading(true);
    try {
      const phoneData = phoneControl._formValues;
      const data = await API.authorization.login({
        grantType: "phone",
        phone: phoneData.countryCode + phoneData.phone,
        verificationCode,
        scope: "user_identity",
      });

      Cookies.set("QuickJobs.tokens", JSON.stringify(data), {
        expires: 30,
        secure: true,
        sameSite: "strict",
      });

      // Restore token to API wrapper for subsequent calls
      API.restoreUserToken(data);

      // Use the isNewUser state that was set during sendVerification
      if (isNewUser) {
        setStep(2);
      } else {
        callback();
      }
    } catch {
      toast({
        title: "Chyba",
        description: "Zadali jste špatný kód nebo došlo k chybě.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (data: RegistrationFormType) => {
    setLoading(true);
    try {
      const profileData: any = {
        user_source: data.howDidYouHearAboutUs,
      };

      if (data.givenName && data.givenName.trim()) {
        profileData.givenName = data.givenName;
      }

      if (data.familyName && data.familyName.trim()) {
        profileData.familyName = data.familyName;
      }

      if (data.email && data.email.trim()) {
        profileData.email = data.email;
      }
      profileData.roles = ["employer"];
      const formData = new FormData();
      const response = await fetch("/images/placeholder.png");
      const blob = await response.blob();
      formData.append("image", blob, "placeholder.png");
      formData.append("imageType", "face");
      await fetch(`/api/upload/face`, {
        method: "POST",
        body: formData,
      });
      await API.users.updateProfile(profileData);

      // Invalidate and refetch profile cache so dashboard sees updated data
      await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
      await queryClient.refetchQueries({ queryKey: [API_KEYS.PROFILE] });

      // Small delay to ensure cache is properly updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      callback();
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Chyba registrace",
        description:
          "Nepodařilo se dokončit registraci. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <form
            onSubmit={handlePhoneSubmit(handleSendCode)}
            className="space-y-4 relative py-2"
          >
            <p className="text-red-500 text-xs absolute right-0 top-0">
              {phoneErrors.phone ? phoneErrors.phone.message : " "}
            </p>
            <div className="flex flex-row gap-[10px] relative">
              <Controller
                name="countryCode"
                control={phoneControl}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setPhoneValue("countryCode", value);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      {field.value}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+420">+420</SelectItem>
                      <SelectItem value="+421">+421</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                name="phone"
                control={phoneControl}
                render={({ field }) => (
                  <Input
                    className="flex-1"
                    type="tel"
                    placeholder="Zadejte telefonní číslo"
                    wrapperProps={{ className: "flex-1" }}
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value.replace(/\s/g, ""))
                    }
                  />
                )}
              />
            </div>
            <p className="text-sm text-gray-500 text-center">
              Tel. číslo slouží k přihlášení a vašemu spojení s uchazeči v rámci
              služby QuickJOBS.
            </p>
            <Button
              type="submit"
              className="mt-4 w-full uppercase"
              disabled={loading}
            >
              {loading ? "Odesílání..." : "Přihlásit / Registrovat"}
            </Button>
            <p className="text-sm text-gray-500 text-center mt-2">
              Přihlášením souhlasíte s{" "}
              <a
                href={LINK_TERM_OF_TRADE}
                className="text-emerald-500"
                target="_blank"
              >
                obchodními podmínkami
              </a>{" "}
              a s{" "}
              <a
                href={LINK_PRIVACY_POLICY}
                className="text-emerald-500"
                target="_blank"
              >
                poskytnutím a zpracováním osobních údajů
              </a>
              .
            </p>
          </form>
        );
      case 1:
        return (
          <div className="flex justify-center flex-col items-center">
            <p className="text-sm text-gray-500 mb-4">
              SMS jsme vám zaslali na číslo{" "}
              {`${phoneControl._formValues.countryCode} ${phoneControl._formValues.phone.replace(/(\d{3})(?=\d)/g, "$1 ")}`}
            </p>
            <InputOTP maxLength={4} onComplete={handleVerifyCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
            <Button
              className="mt-4 w-full uppercase"
              disabled={loading}
              onClick={handlePhoneSubmit(handleSendCode)}
            >
              {loading ? "Ověřování..." : "Pokračovat"}
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Nepřišel vám kód?{" "}
              <button
                className="text-emerald-500"
                onClick={handlePhoneSubmit(handleSendCode)}
              >
                Odeslat SMS znovu
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Zadali jste špatně telefonní číslo?{" "}
              <button className="text-emerald-500" onClick={() => setStep(0)}>
                Začít znovu
              </button>
            </p>
          </div>
        );
      case 2:
        return (
          <form
            onSubmit={handleRegistrationSubmit(handleRegistration)}
            className="space-y-4"
          >
            <Controller
              name="givenName"
              control={registrationControl}
              render={({ field }) => (
                <Input placeholder="Vaše jméno" {...field} className="mt-6" />
              )}
            />
            {registrationErrors.givenName && (
              <p className="text-red-500 text-xs">
                {registrationErrors.givenName.message}
              </p>
            )}
            <Controller
              name="familyName"
              control={registrationControl}
              render={({ field }) => (
                <Input placeholder="Příjmení/Název společnosti" {...field} />
              )}
            />
            {registrationErrors.familyName && (
              <p className="text-red-500 text-xs">
                {registrationErrors.familyName.message}
              </p>
            )}
            <Controller
              name="email"
              control={registrationControl}
              render={({ field }) => (
                <Input placeholder="Pracovní email" {...field} />
              )}
            />

            {registrationErrors.email && (
              <p className="text-red-500 text-xs">
                {registrationErrors.email.message}
              </p>
            )}
            <Controller
              name="howDidYouHearAboutUs"
              control={registrationControl}
              render={({ field }) => (
                <Input
                  placeholder="Jak jste se o nás dozvěděli?"
                  {...field}
                  className="mb-6"
                />
              )}
            />
            <Button
              type="submit"
              className="w-full uppercase"
              disabled={loading}
            >
              {loading ? "Dokončování..." : "Dokončit registraci"}
            </Button>
          </form>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (step) {
      case 0:
        return "PRO ZAMĚSTNAVATELE";
      case 1:
        return "Opište kód z SMS";
      case 2:
        return "Dokončete svou registraci";
      default:
        return "";
    }
  };

  const getSubtitle = () => {
    if (step === 0) return "Zadejte své telefonní číslo";
    return "";
  };

  return (
    <div className="flex flex-col items-center justify-center top-[20px] ">
      {isMounted && <Toaster />}
      <Card className="w-full max-w-md p-6 shadow-md ">
        {isLoading ? (
          <div className="flex justify-center items-center w-[398px] h-[370px]">
            <Loader className="animate-spin" />
          </div>
        ) : (
          <>
            <CardHeader className="pb-0">
              <h1 className="text-2xl font-bold text-center">{getTitle()}</h1>
              <p className="text-center text-sm text-gray-500">
                {getSubtitle()}
              </p>
            </CardHeader>
            <CardContent>{renderStepContent()}</CardContent>
          </>
        )}
      </Card>
      <a
        href={LINK_APP_DOWNLOAD}
        className="text-md text-gray-500 mt-4 underline"
        target="_blank"
      >
        <b>JSTE UCHAZEČ?</b> Stáhněte si mobilní aplikaci zde.
      </a>
    </div>
  );
};
