import { Controller } from "react-hook-form";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { DatePicker } from "@ui/components/core/DatePicker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@ui/components/core/select";
import { PersonalDetailsForm } from "../helpers/onboardingHelpers";
import { Control, FieldErrors } from "react-hook-form";
import { FormEventHandler } from "react";

interface PersonalDetailsStepProps {
    control: Control<PersonalDetailsForm>;
    errors: FieldErrors<PersonalDetailsForm>;
    isValid: boolean;
    isLoading: boolean;
    onSubmit: FormEventHandler<HTMLFormElement>;
}

export const PersonalDetailsStep = ({
    control,
    errors,
    isValid,
    isLoading,
    onSubmit,
}: PersonalDetailsStepProps) => {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="givenName">Jméno</Label>
                    <Controller
                        name="givenName"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="givenName"
                                placeholder="Jméno"
                                {...field}
                                className={errors.givenName ? "border-red-500" : ""}
                            />
                        )}
                    />
                    {errors.givenName && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.givenName.message}
                        </p>
                    )}
                </div>
                <div>
                    <Label htmlFor="familyName">Příjmení</Label>
                    <Controller
                        name="familyName"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="familyName"
                                placeholder="Příjmení"
                                {...field}
                                className={errors.familyName ? "border-red-500" : ""}
                            />
                        )}
                    />
                    {errors.familyName && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.familyName.message}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <Label htmlFor="email">E-mail</Label>
                <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="email"
                            type="email"
                            placeholder="E-mail"
                            {...field}
                            className={errors.email ? "border-red-500" : ""}
                        />
                    )}
                />
                {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="birthDate">Datum narození</Label>
                    <Controller
                        name="birthDate"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Vyber datum"
                                disablePastDates={false}
                            />
                        )}
                    />
                    {errors.birthDate && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.birthDate.message}
                        </p>
                    )}
                </div>
                <div>
                    <Label htmlFor="gender">Pohlaví</Label>
                    <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger
                                    id="gender"
                                    className={errors.gender ? "border-red-500" : ""}
                                >
                                    <SelectValue placeholder="Vyber pohlaví" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Muž</SelectItem>
                                    <SelectItem value="female">Žena</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.gender && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.gender.message}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <Label htmlFor="userSource">
                    Odkud ses o QuickJOBS dozvěděl/a?
                </Label>
                <Controller
                    name="userSource"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="userSource"
                            placeholder="Odkud ses o QuickJOBS dozvěděl/a?"
                            {...field}
                            className={errors.userSource ? "border-red-500" : ""}
                        />
                    )}
                />
                {errors.userSource && (
                    <p className="text-red-500 text-xs mt-1">
                        {errors.userSource.message}
                    </p>
                )}
            </div>

            <Button
                type="submit"
                className="w-full uppercase"
                disabled={!isValid || isLoading}
            >
                {isLoading ? "Ukládám..." : "Pokračovat"}
            </Button>
        </form>
    );
};


