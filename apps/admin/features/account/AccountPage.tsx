"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Input } from "@ui/components/core/input";
import { useToast } from "@ui/hooks/use-toast";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { useAdminSession } from "@/features/auth/SessionProvider";
import { changeAdminPassword } from "@/features/auth/api";

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "Zadej původní heslo"),
    newPassword: z.string().min(8, "Nové heslo musí mít aspoň 8 znaků"),
    confirmPassword: z.string().min(1, "Potvrď nové heslo"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Hesla se musí shodovat",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function AccountPage() {
  const { toast } = useToast();
  const { user } = useAdminSession();
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: PasswordFormValues) =>
      changeAdminPassword({
        oldPassword,
        newPassword,
      }),
    onSuccess: () => {
      form.reset();
      toast({
        title: "Heslo změněno",
        description: "Backend změnu přijal a session zůstává aktivní.",
      });
    },
    onError: (error) => {
      toast({
        title: "Změna hesla selhala",
        description:
          (error as { message?: string }).message ?? "Backend změnu hesla odmítl. Zkus to prosím znovu.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="My Account"
        description="Informativní přehled přihlášeného admin uživatele a read-only shell nad změnou hesla."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-3 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Admin session</p>
            <div className="space-y-1">
              <p className="font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                {user?.givenName || user?.familyName ? `${user?.givenName ?? ""} ${user?.familyName ?? ""}`.trim() : "Bez jména"}
              </p>
              <p className="text-sm text-slate-600">{user?.email ?? "Email není k dispozici"}</p>
              <p className="text-sm text-slate-600">{user?.phone ?? "Telefon není k dispozici"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Role z backendu jsou ve v1 jen informativní. UI podle nich zatím nedělí menu ani neodemyká mutace.
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Change Password</p>
              <h2 className="font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">Změna hesla</h2>
            </div>
            <form className="space-y-5" onSubmit={form.handleSubmit((values) => changePasswordMutation.mutate(values))}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Původní heslo</label>
                <Input type="password" {...form.register("oldPassword")} error={form.formState.errors.oldPassword?.message} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nové heslo</label>
                <Input type="password" {...form.register("newPassword")} error={form.formState.errors.newPassword?.message} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Potvrzení nového hesla</label>
                <Input
                  type="password"
                  {...form.register("confirmPassword")}
                  error={form.formState.errors.confirmPassword?.message}
                />
              </div>
              <Button className="w-full" disabled={changePasswordMutation.isPending} type="submit">
                {changePasswordMutation.isPending ? "Ukládám..." : "Změnit heslo"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
