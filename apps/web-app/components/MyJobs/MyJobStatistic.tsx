"use client";

import { Skeleton } from "@ui/components/core/skeleton";
import { TryAgain } from "@ui/components/TryAgain";
import { useJobDetail } from "@ui/hooks/useJobDetail";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export const MyJobStatistic = () => {
	const pathname = usePathname();

	const id = pathname.split("/").pop();
	const { data, isLoading, error, refetch } = useJobDetail(id!);

	const { jobVisits, applied, appliedTotal, ignored, rejected, savedTotal } =
		data?.stats ?? {};

	const STATISTIC_ITEMS = useMemo(
		() => [
			{
				label: "Prokliknutí do detailu inzerátu",
				value: jobVisits,
			},
			{
				label: "Nových uchazečů",
				value: applied,
			},
			{
				label: "Zaujalo mě",
				value: savedTotal,
			},
			{
				label: "Celkem uchazečů",
				value: appliedTotal,
			},
			{
				label: "Odmítlo nabídky",
				value: ignored,
			},
			{
				label: "Nezaujalo mě",
				value: rejected,
			},
		],
		[data],
	);

	return (
		<div className="min-w-[500px] h-[100px] flex flex-col bg-green-100 justify-center px-6 py-4 gap-3 shadow">
			{!error ? (
				<div className="grid grid-cols-3 gap-4 text-left">
					<>
						{STATISTIC_ITEMS.map((item, index) => (
							<div className="flex items-center gap-2" key={index}>
								{item.label}:&nbsp;
								{isLoading || !data ? (
									<Skeleton color="white" className="w-10 h-4 " />
								) : (
									<span className="font-bold">{item.value ?? 0}</span>
								)}
							</div>
						))}
					</>
				</div>
			) : (
				<div className="flex items-center justify-center">
					<div className="flex items-center gap-2">
						<TryAgain refetch={refetch} />
					</div>
				</div>
			)}
		</div>
	);
};
