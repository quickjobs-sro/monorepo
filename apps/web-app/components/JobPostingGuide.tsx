"use client";

import { useRouter } from "next/navigation";

const steps = [
  {
    id: 1,
    title: "Vystavíte inzerát",
    description:
      "Jako zaměstnavatel vyplníte a odešlete inzerát. Uživatelé ihned dostanou oznámení o vaší nabídce.",
    src: "/icons/1.svg",
  },
  {
    id: 2,
    title: "Prohlédnete si profily uchazečů",
    description:
      "Uchazeče uvidíte okamžitě po projevení zájmu o vaši nabídku. Upozorníme vás emailem a telefonicky.",
    src: "/icons/2.svg",
  },
  {
    id: 3,
    title: "Zkontaktujete uchazeče a domluvíte se",
    description:
      "Vybraným uchazečům zavoláte nebo napíšete email a domluvíte se na dalších krocích.",
    src: "/icons/3.svg",
  },
  {
    id: 4,
    title: "Ohodnotíte se",
    description:
      "V aplikaci můžete uživatele ohodnotit hvězdičkami a slovní recenzí.",
    src: "/icons/4.svg",
  },
];

export const JobPostingGuide = () => {
  const router = useRouter();
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 my-20">
      <h2 className="text-center text-5xl text-gray-500 pb-6">
        Jak inzerce funguje?
      </h2>

      <div className="flex flex-col md:flex-row gap-16 items-start pt-6">
        <div className="w-full gap-4">
          <iframe
            className="w-full aspect-video rounded-lg shadow-lg"
            src="https://www.youtube.com/embed/WKlZHid2gHg"
            title="Jak aplikace funguje?"
            allowFullScreen
          ></iframe>
        </div>
        <div className="w-full md:w-1/3 space-y-6 ">
          {steps.map(({ id, src, description, title }) => (
            <div key={id} className="flex gap-4">
              <img
                src={src}
                alt="QuickJOBS Logo"
                className="h-[55px] w-[40px]"
              />
              <div>
                <h3 className="text-md font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-700 text-sm">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 !mt-0">
        <button
          className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
          onClick={() => router.push("/dashboard/jobs/full-time?open=true")}
        >
          Vystavit plný úvazek
        </button>

        <button
          className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
          onClick={() => router.push("/dashboard/jobs/long-time?open=true")}
        >
          Vystavit dlouhodobou brigádu
        </button>
        <button
          className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
          onClick={() => router.push("/dashboard/jobs/one-time?open=true")}
        >
          Vystavit jednorázovou brigádu
        </button>
      </div>
    </div>
  );
};
