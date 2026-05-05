"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/components/core/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ui/components/core/dialog";
import { Skeleton } from "@ui/components/core/skeleton";
import { getUserInfo, sendInquiry } from "@ui/helpers";
import { toast } from "@ui/hooks/use-toast";
import { useGetServiceInfo } from "@ui/hooks/useGetServiceInfo";
import { cn } from "@ui/lib/utils";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const JOBS_TYPES = ["Plné úvazky", "Dlouhodobá brigáda", "Jednorázová brigáda"];
const FAPI_LINK =
  "https://form.fapi.cz/?id=61bd41a1-b10d-40f0-9f87-da9ac659cf87";

const getJobTypeFromQuery = (jobType: string) => {
  switch (jobType) {
    case "fullTime":
      return "Plné úvazky";
    case "longTerm":
      return "Dlouhodobá brigáda";
    case "oneTime":
      return "Jednorázová brigáda";
    default:
      return "Plné úvazky";
  }
};

export const PricingFeatures = () => {
  const [pricingPlans, setPricingPlans] = useState<{
    [key: string]: {
      name: string;
      price: number;
      tag: string;
      description: string;
    }[];
  }>({
    "Plné úvazky": [],
    "Dlouhodobá brigáda": [],
    "Jednorázová brigáda": [],
  });

  const { data: serviceInfo, isLoading: isLoadingServiceInfo } =
    useGetServiceInfo();

  const searchParams = useSearchParams();
  const jobType = searchParams.get("jobType");
  const [activePlan, setActivePlan] = useState<keyof typeof PRICING_PLANS>(() =>
    getJobTypeFromQuery(jobType ?? "")
  );

  useEffect(() => {
    if (!serviceInfo?.packages) return;

    const formatPrice = (price: number) =>
      price.toLocaleString("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      });

    const grouped = {
      "Plné úvazky": [] as any[],
      "Dlouhodobá brigáda": [] as any[],
      "Jednorázová brigáda": [] as any[],
    };

    serviceInfo.packages.forEach((pkg: any) => {
      const { jobTerm, price } = pkg;

      const termKeyMap = {
        full_time: "fullTime",
        long_term: "longTerm",
        one_time: "oneTime",
      } as const;

      const mappedTermKey = termKeyMap[jobTerm as keyof typeof termKeyMap];
      const creditCount =
        pkg.jobCredit > 0
          ? pkg.jobCredit
          : (pkg.jobCredits?.[mappedTermKey] ?? 0);

      if (creditCount <= 0) return;

      const tag =
        creditCount === 1
          ? undefined
          : creditCount <= 3
            ? "Hledám občas"
            : creditCount <= 10
              ? "Hledám často"
              : "Hledám často";

      const name = `${creditCount} inzerát${
        creditCount > 1 && creditCount < 5 ? "y" : creditCount > 5 ? "ů" : ""
      }`;
      const description = `${formatPrice(price / creditCount)}`;

      switch (jobTerm) {
        case "full_time":
          grouped["Plné úvazky"].push({ name, price, tag, description });
          break;
        case "long_term":
          grouped["Dlouhodobá brigáda"].push({ name, price, tag, description });
          break;
        case "one_time":
          grouped["Jednorázová brigáda"].push({
            name,
            price,
            tag,
            description,
          });
          break;
      }
    });

    setPricingPlans(grouped);
  }, [serviceInfo]);

  const PRICING_PLANS = useMemo(() => {
    return {
      "Plné úvazky": [
        {
          tag: undefined,
          adverts: 1,
          name: "1 inzerát",
          price: 4290,
          description: "4 290 Kč za kus",
        },
        {
          tag: "Hledám příležitostně",
          name: "3 inzeráty",
          price: 9990,
          description: "3 330 Kč za kus",
        },
        {
          tag: "Hledám občas",
          name: "10 inzerátů",
          price: 19990,
          description: "1 999 Kč za kus",
        },
      ],
      "Dlouhodobá brigáda": [
        {
          tag: "Na dokoupení",
          name: "1 inzerát",
          price: 990,
          description: "990 Kč za kus",
        },
        {
          tag: "Hledám občas",
          name: "3 inzerátů",
          price: 2390,
          description: "797,67 Kč za kus",
        },
        {
          tag: "Stále hledáme",
          name: "10 inzerátů",
          price: 4990,
          description: "499 Kč za kus",
        },
      ],
      "Jednorázová brigáda": [
        {
          tag: "Na dokoupení",
          name: "1 inzerát",
          price: 490,
          description: "490 Kč za kus",
        },
        {
          tag: "Hledám občas",
          name: "3 inzerátů",
          price: 699,
          description: "233 Kč za kus",
        },
        {
          tag: "Stále hledáme",
          name: "10 inzerátů",
          price: 1990,
          description: "199 Kč za kus",
        },
      ],
    };
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<{
    name: string;
    price: number;
  } | null>(null);

  const userInfo = getUserInfo();
  const data = userInfo?.data;

  const handleSendInquiry = async () => {
    try {
      setIsLoading(true);
      await sendInquiry({
        email: data?.email ?? "neznámý email",
        name: `${data?.givenName ?? "neznámé jméno"} ${
          data?.familyName ?? "neznámé příjmení"
        }`,
        subject: "Zájemce o nabídku na míru",
        message: `Uživatel s ID ${data?.id ?? "neznámé ID"} poptává balíček na míru. Jedná se o práci typu: ${activePlan}`,
      });

      toast({
        title: "Žádost o nabídku odeslána",
      });
      setIsLoading(false);
      setIsOpen(false);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Žádost o nabídku se nepodařila odeslat",
      });
    }
  };

  if (isLoadingServiceInfo) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 w-2/3 mx-auto">
          {JOBS_TYPES.map((jobType) => (
            <div className="w-full" key={jobType}>
              <Skeleton className="h-14 w-full" />
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 py-4 px-4 border border-transparent text-center rounded-full my-10">
          <h3 className="font-bold">
            Garantujeme vám 3 uchazeče o vaši nabídku, jinak vám inzerát ZDARMA
            vrátíme.
          </h3>
        </div>
        <div className="flex gap-4 w-full mx-auto">
          {[...Array(3)].map((_, index) => (
            <Card
              key={index}
              className="w-full bg-white border-none shadow-[0_0_10px_8px_rgba(0,0,0,0.1)] border-gray-200 border"
            >
              <CardHeader>
                <Skeleton className="h-6 w-2/3 mx-auto rounded-full" />
                <div className="py-4">
                  <Skeleton className="h-8 w-1/2 mx-auto" />
                </div>
                <CardContent className="px-0 pb-0">
                  <Skeleton className="h-10 w-3/4 mx-auto" />
                  <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
                  <Skeleton className="h-10 w-full mt-8" />
                </CardContent>
              </CardHeader>
            </Card>
          ))}
          <Card className="w-full bg-white border-none shadow-[0_0_10px_8px_rgba(0,0,0,0.1)] border-gray-200 border">
            <CardHeader>
              <CardTitle className="text-2xl py-2">
                Chcete nabídku na míru?
              </CardTitle>
              <CardDescription className="text-md py-2 text-gray-400">
                Zanechte nám váš kontakt a my se vám ozveme hned jak to bude
                možné
              </CardDescription>
              <CardContent className="flex justify-center w-full px-0 pb-0">
                <Skeleton className="h-10 w-full mt-6" />
              </CardContent>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex gap-2 w-2/3 mx-auto">
        {JOBS_TYPES.map((jobType) => {
          return (
            <div className="w-full" key={jobType}>
              <button
                className={cn(
                  "w-full bg-gray-200 py-4 px-4 border border-transparent shadow-md rounded-sm",
                  activePlan === jobType &&
                    "bg-green-100 border border-green-500 border-solid text-green-500"
                )}
                onClick={() =>
                  setActivePlan(jobType as keyof typeof PRICING_PLANS)
                }
              >
                <h3>{jobType}</h3>
              </button>
            </div>
          );
        })}
      </div>
      <div className="w-full bg-gray-200 py-4 px-4 border border-transparent text-center rounded-full my-10">
        <h3 className="text-sm">
          <b>Garantujeme vám 3 uchazeče</b> o vaši nabídku, <b>jinak</b> vám
          inzerát
          <b> ZDARMA</b> vrátíme.
        </h3>
      </div>
      <div className="flex gap-4 w-full mx-auto">
        {pricingPlans[activePlan]?.map(({ tag, name, price, description }) => {
          return (
            <Card
              key={name}
              className="w-full bg-white border-none shadow-[0_0_10px_8px_rgba(0,0,0,0.1)] border-gray-200 border"
            >
              <CardHeader>
                <CardTitle
                  className={cn(
                    "text-sm rounded-full px-2 py-1 text-center",
                    tag ? "bg-gray-200 " : "bg-transparent text-gray-400 h-7"
                  )}
                >
                  {tag || ""}
                </CardTitle>
                <CardDescription className="text-2xl text-center py-4 uppercase">
                  {name}
                </CardDescription>
                <CardContent className="px-0 pb-0">
                  <p className="text-3xl text-center text-green-500 font-bold">
                    {description}{" "}
                    <span className="text-sm text-gray-500">/ inzerát</span>
                  </p>

                  <p className="text-sm mt-2 text-gray-500 text-center">
                    {price.toLocaleString("cs-CZ", {
                      style: "currency",
                      currency: "CZK",
                      minimumFractionDigits: 0,
                    })}{" "}
                    celkem
                  </p>
                  <button
                    onClick={() => window.open(FAPI_LINK, "_blank")}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-sm mt-8 uppercase"
                  >
                    KOUPIT
                  </button>
                </CardContent>
              </CardHeader>
            </Card>
          );
        })}
        <Card className="w-full bg-white border-none shadow-[0_0_10px_8px_rgba(0,0,0,0.1)] border-gray-200 border">
          <CardHeader>
            <CardTitle className="text-2xl py-2 w-52">
              Chcete nabídku na míru?
            </CardTitle>
            <CardDescription className="text-md py-2 text-gray-400">
              Zanechte nám váš kontakt a my se vám ozveme hned jak to bude
              možné.
            </CardDescription>
            <CardContent className="flex justify-center w-full px-0 pb-0">
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <button className="w-full bg-green-500 text-white py-2 px-4 rounded-sm mt-6 uppercase">
                    Zanechat kontakt
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-center">
                      Balíček na míru
                    </DialogTitle>
                  </DialogHeader>
                  <DialogDescription>
                    Souhlasíte-li, ozveme se vám, abychom společně našli vhodné
                    řešení.
                  </DialogDescription>
                  <DialogFooter className="flex justify-center">
                    <button
                      disabled={isLoading}
                      className={cn(
                        "bg-green-500 text-white py-2 px-4 rounded-sm mt-6 uppercase mx-auto",
                        isLoading && "bg-gray-300 cursor-not-allowed"
                      )}
                      onClick={handleSendInquiry}
                    >
                      {isLoading ? "Odesílám..." : "ANO, kontaktujte mě"}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </CardHeader>
        </Card>
      </div>
      <p className="text-md text-gray-500 text-center my-4">
        Inzeráty můžete <b>využít</b> kdykoliv
        <b> během 365 dní</b> od zakoupení.
      </p>
    </div>
  );
};
