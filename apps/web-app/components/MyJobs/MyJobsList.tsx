"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/core/popover";
import { ScrollArea } from "@ui/components/core/scroll-area";
import {
	ScrollBottomShadow,
	ScrollTopShadow,
} from "@ui/components/core/scroll-shadows";
import { Skeleton } from "@ui/components/core/skeleton";
import {
	InfiniteScrollEnd,
	InfiniteScrollLoading,
} from "@ui/components/InfiniteScrollIndicators";
import { HEIGHT_NAV_BAR } from "@ui/components/Navbar";
import { getGenderString } from "@ui/helpers/getGenderString";
import { getJobEndAtDaysAndHours } from "@ui/helpers/getJobEndAtDaysAndHours";
import { getSalaryString } from "@ui/helpers/getSalaryString";
import { getStartDateString } from "@ui/helpers/getStartDateString";
import { useMyJobs } from "@ui/hooks/useMyJobs";
import { useScrollHandler } from "@ui/hooks/useScrollHandler";
import { cn } from "@ui/lib/utils";
import { format } from "date-fns";
import {
	BanknoteIcon,
	Calendar,
	InfoIcon,
	MapPinIcon,
	Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { JOB_TERM } from "quickjobs-api-wrapper";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { JOBS_INFO_BAR_HEIGHT } from "./MyJobsInfoBar";
import { MyJobsItem } from "./MyJobsItem";

export const JOB_TYPE_TO_TERM: Record<string, JOB_TERM> = {
	"one-time": JOB_TERM.ONE_TIME,
	"full-time": JOB_TERM.FULL_TIME,
	"long-time": JOB_TERM.LONG_TERM,
};

export const MyJobsList = ({ isHistory = false }: { isHistory?: boolean }) => {
	const router = useRouter();
	const pathname = usePathname();
	const initialScrollDoneForPathRef = useRef(false);

	const jobType = pathname.split("/")[3] as keyof typeof JOB_TYPE_TO_TERM;
	const jobTerm = JOB_TYPE_TO_TERM[jobType];

	const pathSegments = pathname.split("/");
	const selectedJobIdFromPath =
		pathSegments.length === 5 ? pathSegments[4] : undefined;

	const {
		data,
		isLoading,
		isSuccess,
		fetchNextPage,
		isFetchingNextPage,
		hasNextPage,
	} = useMyJobs(jobTerm);

	const handleReachBottom = useCallback(() => {
		if (!isFetchingNextPage && hasNextPage) {
			fetchNextPage();
		}
	}, [isFetchingNextPage, hasNextPage, fetchNextPage]);

	const { showTopShadow, showBottomShadow, onScroll, containerRef, scrollTo } =
		useScrollHandler({
			onReachBottom: handleReachBottom,
		});

	const allJobs = useMemo(() => {
		return data?.pages.flatMap((page) => page.jobs) ?? [];
	}, [data?.pages]);

	const allStats = useMemo(() => {
		return data?.pages.flatMap((page) => page.stats) ?? [];
	}, [data?.pages]);

	const sortedJobs = useMemo(() => {
		if (!allJobs) return [];
		return [...allJobs].sort((a, b) => {
			if (a.status === "active" && b.status !== "active") return -1;
			if (a.status !== "active" && b.status === "active") return 1;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
	}, [allJobs]);

	/** Max stránek při hledání vybraného jobu v URL – brání nekonečnému loadu. */
	const MAX_FETCH_TO_FIND_SELECTED = 30;
	const fetchCountForSelectedRef = useRef(0);

	const sortedJobsWithStats = useMemo(() => {
		if (!sortedJobs) return [];
		return sortedJobs.map((job) => {
			const jobStats = allStats?.find((stat) => stat.jobId === job.id);
			return { ...job, stats: jobStats };
		});
	}, [sortedJobs, allStats]);

	useEffect(() => {
		initialScrollDoneForPathRef.current = false;
		fetchCountForSelectedRef.current = 0;
	}, [selectedJobIdFromPath]);

	useEffect(() => {
		if (selectedJobIdFromPath && !isLoading && scrollTo && jobTerm) {
			const itemIsLoaded = allJobs?.some(
				(job) => String(job.id) === selectedJobIdFromPath,
			);

			if (itemIsLoaded) {
				if (!initialScrollDoneForPathRef.current) {
					requestAnimationFrame(() => {
						scrollTo("#isSelected", 0, "smooth");
					});
					initialScrollDoneForPathRef.current = true;
				}
			} else {
				const underLimit =
					fetchCountForSelectedRef.current < MAX_FETCH_TO_FIND_SELECTED;
				if (hasNextPage && !isFetchingNextPage && underLimit) {
					fetchCountForSelectedRef.current += 1;
					fetchNextPage();
				}
			}
		}
	}, [
		selectedJobIdFromPath,
		isLoading,
		allJobs,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		scrollTo,
		jobTerm,
	]);

	useEffect(() => {
		if (
			isSuccess &&
			jobTerm &&
			data &&
			pathname === `/dashboard/jobs/${jobType}` &&
			!pathSegments[4] &&
			sortedJobsWithStats.length > 0
		) {
			const firstJobId = sortedJobsWithStats[0]?.id;
			if (firstJobId && !isNaN(Number(firstJobId))) {
				router.push(`/dashboard/jobs/${jobType}/${firstJobId}`);
			}
		}
	}, [
		isSuccess,
		data,
		pathname,
		jobType,
		sortedJobsWithStats,
		router,
		jobTerm,
		pathSegments,
	]);

	if (!jobTerm) {
		return null;
	}

	if (isLoading && jobTerm) {
		return (
			<div className="flex flex-col max-w-[750px] min-w-[200px] h-full">
				{Array.from({ length: 6 }).map((_, index) => (
					<div
						key={index}
						className="w-full h-[233px] p-4 border-b border-gray-200 flex flex-col gap-2 rounded-none bg-white justify-center"
					>
						<Skeleton className="h-5 w-3/4 rounded-md" color="gray" />
						<Skeleton className="h-4 w-full rounded-md" color="gray" />
						<Skeleton className="h-4 w-5/6 rounded-md" color="gray" />
						<Skeleton className="h-5 w-3/4 rounded-md" color="gray" />
						<Skeleton className="h-4 w-5/6 rounded-md" color="gray" />
						<Skeleton className="h-5 w-3/4 rounded-md" color="gray" />
					</div>
				))}
			</div>
		);
	}

	if (!isLoading && allJobs.length === 0) {
		return <div className="w-full p-4">No jobs found</div>;
	}

	return (
		<div className="flex flex-col min-w-[200px] h-full">
			<ScrollArea
				className={`w-full mr-4 z-10`}
				style={{
					height: `calc(100dvh - ${HEIGHT_NAV_BAR}px - ${JOBS_INFO_BAR_HEIGHT
						}px)`,
				}}
				onScroll={onScroll}
				ref={containerRef}
			>
				<ScrollTopShadow show={showTopShadow} />
				<div className="px-[1px]">
					{sortedJobsWithStats.map((job) => {
						const isSelected = String(job.id) === pathname.split("/").pop();
						const isActive = job.status === "active";
						const jobStats = job.stats;

						return (
							<div
								key={job.id}
								id={isSelected ? "isSelected" : undefined}
								onClick={() =>
									router.push(`/dashboard/jobs/${jobType}/${job.id}`)
								}
								className={cn(
									"w-full text-left hover:shadow-lg hover:z-[2] relative transition-colors cursor-pointer ",
									!isActive && "bg-[#F2F2F2]",
									isActive && "bg-white",
									isSelected && "bg-[#F0FCF8]",
								)}
							>
								<MyJobsItem>
									<MyJobsItem.Header {...job} />
									<MyJobsItem.Content>
										<div className="flex flex-col gap-2 w-[calc(100%-50px)]">
											<div className="flex-1 flex items-center gap-2 text-nowrap text-md">
												{job.status === "active" ? (
													<>
														Zveřejněno ještě{" "}
														<b>{getJobEndAtDaysAndHours(job)}</b>{" "}
														<Popover>
															<PopoverTrigger>
																<InfoIcon className="w-4 h-4 text-green-500" />
															</PopoverTrigger>
															<PopoverContent>
																<p className="text-xs">
																	{jobTerm === JOB_TERM.ONE_TIME
																		? "Vaše nabídky je zveřejněna až do 24 hodin po datu ukončení práce, maximálně však na 30 dní."
																		: `Uchazeči mají 90 dnů na projevení zájmu o vaši nabídku.`}
																</p>
															</PopoverContent>
														</Popover>
													</>
												) : (
													<b>Inzerát již není aktivní</b>
												)}
											</div>
											<div
												className={cn(
													"text-xs text-gray-700 line-clamp-2 transition-all duration-100 mb-4",
													isSelected && "line-clamp-none  font-normal text-xs",
												)}
												dangerouslySetInnerHTML={{
													__html: job.description.replace(/\n/g, "<br />"),
												}}
											/>

											<div className="flex items-center gap-x-8 text-xs">
												<span className="flex-1 flex items-center gap-2 text-gray-600">
													<MapPinIcon className="w-3 h-3 text-gray-600" />
													{job.place.address}
												</span>
												<span className="flex-1 flex items-center gap-2 text-gray-600">
													<Calendar className="w-3 h-3 text-gray-600" />
													Nástup:{" "}
													{getStartDateString({
														...job,
													})}
												</span>
											</div>
											<div className="flex items-center gap-8 text-xs">
												<div className="flex-1 flex items-center gap-2 text-gray-600">
													<BanknoteIcon className="w-3 h-3 text-gray-600" />
													{getSalaryString(job)}
												</div>
												<div className="flex-1 flex items-center gap-2 text-gray-600">
													<Users className="w-3 h-3 text-gray-600" />
													{getGenderString(job)}
												</div>
											</div>
											<div className="flex items-center gap-8 text-gray-600 text-xs">
												<div className="flex-1 flex items-center gap-2 text-nowrap">
													<Calendar className="w-3 h-3" />
													Vytvořeno {format(job.createdAt, "dd.MM.yyyy HH:mm")}
												</div>
											</div>
											<div className="grid grid-cols-2 gap-x-8 gap-y-1 my-4 text-[13px]">
												<div>
													<span className="font-semibold">
														Nových uchazečů:{" "}
													</span>
													<span className="font-bold">
														{jobStats?.applied ?? 0}
													</span>{" "}
													/{" "}
													<span className="font-bold">
														{jobStats?.appliedTotal ?? 0}
													</span>
												</div>

												<div>
													<span className="font-semibold">Zaujalo mě: </span>
													<span className="font-bold">
														{jobStats?.savedTotal ?? 0}
													</span>
												</div>
												<div>
													<span className="font-semibold">
														Prokliknutí do detailu:{" "}
													</span>
													<span className="font-bold">
														{jobStats?.jobVisits ?? 0}
													</span>
												</div>
												<div>
													<span className="font-semibold">
														Odmítlo nabídku:{" "}
													</span>
													<span className="font-bold">
														{jobStats?.ignored ?? 0}
													</span>
												</div>
											</div>
										</div>
									</MyJobsItem.Content>
									<MyJobsItem.Footer></MyJobsItem.Footer>
								</MyJobsItem>
							</div>
						);
					})}
				</div>
				<InfiniteScrollLoading
					isLoading={isFetchingNextPage}
					loadingText="Načítají se další pracovní nabídky"
				/>
				<InfiniteScrollEnd
					hasReachedEnd={!isFetchingNextPage && !hasNextPage}
					hasItems={allJobs.length > 0}
					endText="Jste na konci seznamu nabídek"
				/>
				<ScrollBottomShadow show={showBottomShadow} />
			</ScrollArea>
		</div>
	);
};
