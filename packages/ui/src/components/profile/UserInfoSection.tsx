"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { Textarea } from "@ui/components/core/textarea";
import { useToast } from "@ui/hooks/use-toast";
import { Info, Mail, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { API } from "../../hooks";
import { queryClient } from "../../Providers/ServerProvider";
import { API_KEYS } from "../../types/api_keys";

const MAX_DESCRIPTION_LENGTH = 400;

const userInfoSchema = z.object({
  givenName: z.string().min(1, "Křestní jméno je povinné"),
  familyName: z.string().min(1, "Příjmení je povinné"),
  email: z
    .string()
    .email("Neplatný formát e-mailu")
    .min(1, "E-mail je povinný"),
  description: z
    .string()
    .max(500, "Popis nesmí být delší než 500 znaků")
    .optional(),
  phone: z.string().optional(),
});

type UserInfoFormValues = z.infer<typeof userInfoSchema>;

interface UserInfoSectionProps {
  defaultValues: UserInfoFormValues;
}

export const UserInfoSection = ({ defaultValues }: UserInfoSectionProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<UserInfoFormValues>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      givenName: defaultValues.givenName,
      familyName: defaultValues.familyName,
      email: defaultValues.email,
      description: defaultValues.description,
      phone: defaultValues.phone,
    },
  });

  const descriptionValue = watch("description");

  useEffect(() => {
    if (!isEditing) {
      reset(defaultValues);
    }
  }, [defaultValues, reset, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    reset(defaultValues);
    setIsEditing(false);
  };

  const onSubmitHandler: SubmitHandler<UserInfoFormValues> = async (data) => {
    try {
      await API.users.updateProfile(data);
      toast({
        title: "Údaje uloženy",
        description: "Vaše osobní údaje byly úspěšně aktualizovány.",
      });

      await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });

      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error); // Log the actual error
      toast({
        title: "Chyba při ukládání",
        description: "Nepodařilo se uložit vaše údaje. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmitHandler)}
      className="bg-white p-6 shadow rounded-lg space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label
            htmlFor="givenName"
            className="text-sm font-medium text-gray-700"
          >
            Křestní jméno
          </Label>
          <Input
            id="givenName"
            {...register("givenName")}
            disabled={!isEditing || isSubmitting}
            className="mt-1 w-full p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-invalid={errors.givenName ? "true" : "false"}
          />
          {errors.givenName && (
            <p className="text-xs text-red-500 mt-1">
              {errors.givenName.message}
            </p>
          )}
        </div>
        <div>
          <Label
            htmlFor="familyName"
            className="text-sm font-medium text-gray-700"
          >
            Příjmení
          </Label>
          <Input
            id="familyName"
            {...register("familyName")}
            disabled={!isEditing || isSubmitting}
            className="mt-1 w-full p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-invalid={errors.familyName ? "true" : "false"}
          />
          {errors.familyName && (
            <p className="text-xs text-red-500 mt-1">
              {errors.familyName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center mb-1">
          <Mail className="h-5 w-5 text-gray-400 mr-2 shrink-0" />
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            E-mail (kam vám dáme vědět o zájemcích)
          </Label>
        </div>
        <Input
          id="email"
          type="email"
          {...register("email")}
          disabled={!isEditing || isSubmitting}
          className="mt-1 w-full p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-invalid={errors.email ? "true" : "false"}
        />
        {errors.email && (
          <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center mb-1">
          <Phone className="h-5 w-5 text-gray-400 mr-2 shrink-0" />
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Telefonní číslo
          </Label>
        </div>
        <Input
          id="phone"
          type="tel"
          value={defaultValues.phone || "Není k dispozici"}
          disabled
          readOnly
          className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
        />
      </div>

      <div>
        <div className="flex items-center mb-1">
          <Info className="h-5 w-5 text-gray-400 mr-2 shrink-0" />
          <Label
            htmlFor="description"
            className="text-sm font-medium text-gray-700"
          >
            Popis firmy (proč jste zajímaví pro studenty apod.)
          </Label>
        </div>
        <Textarea
          id="description"
          {...register("description")}
          disabled={!isEditing || isSubmitting}
          rows={5}
          className="mt-1 w-full p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
          maxLength={MAX_DESCRIPTION_LENGTH}
          aria-invalid={errors.description ? "true" : "false"}
        />
        {errors.description && (
          <p className="text-xs text-red-500 mt-1">
            {errors.description.message}
          </p>
        )}
        {isEditing && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {(descriptionValue || "").length} / {MAX_DESCRIPTION_LENGTH}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        {isEditing ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Ukládání..." : "Uložit změny"}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={handleEdit} disabled={isSubmitting}>
            Upravit údaje
          </Button>
        )}
      </div>
    </form>
  );
};
