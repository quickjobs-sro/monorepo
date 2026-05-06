"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, SquareArrowOutUpRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@ui/components/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/core/card";
import { Input } from "@ui/components/core/input";
import { useToast } from "@ui/hooks/use-toast";
import { persistClientToken } from "@/lib/auth/cookie";
import { ROUTES } from "@/lib/routes";
import { loginWithPassword } from "./api";
import { adminSessionQueryKey } from "./queries";

const loginSchema = z.object({
  phone: z.string().min(1, "Telefon je povinný"),
  password: z.string().min(1, "Heslo je povinné"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: loginWithPassword,
    onSuccess: async (tokenPair) => {
      persistClientToken({
        ...tokenPair,
        dateOfExpiration: new Date(Date.now() + tokenPair.expiresIn * 1000).toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: adminSessionQueryKey });
      window.location.assign(ROUTES.dashboard);
    },
    onError: (error) => {
      const description =
        (error as { message?: string }).message ?? "Přihlášení se nepodařilo. Zkontroluj údaje a zkus to znovu.";
      toast({
        title: "Přihlášení selhalo",
        description,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_#f7faf8_0%,_#eef2ef_100%)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 py-10 lg:flex-row lg:px-10">
        <section className="flex flex-1 flex-col justify-between rounded-[32px] border border-emerald-950/10 bg-emerald-950 px-8 py-10 text-white shadow-[0_24px_80px_-34px_rgba(6,78,59,0.9)]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
              <ShieldCheck className="h-4 w-4" />
              QuickJobs Admin
            </div>
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-red-hat-display)] text-4xl font-bold tracking-tight lg:text-6xl">
                Read-only command center pro dnešní provoz.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-emerald-50/82 lg:text-base">
                Přehledný admin nad novým API: feedback, jobs, katalogy a systémový stav bez legacy wrapperu a bez
                předstíraných CRUD akcí.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Živé sekce nad aktuálními GET endpointy",
              "Jednotný shell bez frontendových permission hacků",
              "Připravené místo pro další admin domény",
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-white/10 bg-white/8 p-4 text-sm leading-6 text-emerald-50/85">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-full max-w-xl items-center">
          <Card className="w-full border-white/80 bg-white/90 shadow-[0_30px_80px_-34px_rgba(15,23,42,0.45)]">
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
                Secure Login
              </div>
              <CardTitle className="font-[family-name:var(--font-red-hat-display)] text-3xl text-slate-950">
                Přihlášení do administrace
              </CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                Použij stejné telefonní číslo a heslo jako pro admin přístup v backendu.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="space-y-5" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Telefon</label>
                  <Input
                    placeholder="+420 777 000 000"
                    autoComplete="username"
                    {...form.register("phone")}
                    error={form.formState.errors.phone?.message}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Heslo</label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Zadej heslo"
                    {...form.register("password")}
                    error={form.formState.errors.password?.message}
                  />
                </div>
                <Button className="h-12 w-full text-base" disabled={loginMutation.isPending} type="submit">
                  {loginMutation.isPending ? "Přihlašuji..." : "Přihlásit se"}
                </Button>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                V1 je záměrně read-only. Mutace a moderace se doplní až po backend parity.{" "}
                <a className="inline-flex items-center gap-1 font-medium text-emerald-700" href="https://backend.quickjobs.cz/docs-json" target="_blank" rel="noreferrer">
                  Otevřít API JSON
                  <SquareArrowOutUpRight className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
