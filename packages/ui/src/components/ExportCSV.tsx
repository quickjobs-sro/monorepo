import {
	type ApplicationEmployerStatement,
	JOB_TERM,
} from "quickjobs-api-wrapper";
import type React from "react";
import { Button } from "./core/button";
import { statusOptions } from "./dialogs/ContactCandidateDialog";

interface School {
	id: number;
	name: string;
	city: string;
	rid: string;
	type: number;
	www: string;
}

interface SchoolFaculty {
	id: number;
	name: string;
	ridf: number;
	www: string;
	schoolId: number;
}

interface UserSchool {
	id: number;
	userId?: number;
	schoolId?: number;
	schoolFacultyId?: number | null;
	status:
		| "completed"
		| "in_progress"
		| "in_progress_1"
		| "in_progress_2"
		| "in_progress_3"
		| "in_progress_4"
		| "in_progress_5"
		| "in_progress_6";
	endYear?: number | null;
	otherText: string | null;
	school: School;
	schoolFaculty: SchoolFaculty | null;
}

interface Experience {
	id: number;
	createdAt?: string;
	updatedAt?: string;
	title: string;
	companyName: string;
	userId?: number;
}

interface CandidateStatus {
	status: ApplicationEmployerStatement;
	note: string | null;
	deleted: null;
	id: number;
	createdAt: string;
	userId: number;
	candidateId: number;
}

interface User {
	id: number;
	givenName: string;
	familyName: string;
	email: string;
	phone: string;
	gender: "male" | "female";
	birthDate: string;
	age: number;
	companyName: string | null;
	description: string | null;
	skills: string[];
	experience: Experience[];
	userSchools: UserSchool[];
	candidateStatus: CandidateStatus;
}

export interface ApiResponse {
	users: User[];
	total?: number;
}

interface ExportCSVProps {
	fileName?: string;
	queryParams: URLSearchParams | null;
	data: ApiResponse | undefined;
	isLoading: boolean;
	isError: boolean;
}

export const ExportCSV: React.FC<ExportCSVProps> = ({
	fileName,
	queryParams,
	data,
	isLoading,
	isError,
}) => {
	const fullTime = queryParams?.get("fulltime") === "true";
	const longTerm = queryParams?.get("longterm") === "true";
	const oneTime = queryParams?.get("onetime") === "true";
	const jobTerms: JOB_TERM[] = [];

	if (fullTime) {
		jobTerms.push(JOB_TERM.FULL_TIME);
	}
	if (longTerm) {
		jobTerms.push(JOB_TERM.LONG_TERM);
	}
	if (oneTime) {
		jobTerms.push(JOB_TERM.ONE_TIME);
	}

	const formatSchools = (userSchools: UserSchool[]): string => {
		if (!userSchools || userSchools.length === 0) return "";
		return userSchools
			.map((school) => {
				const parts: string[] = [];
				if (school.school && school.school.name) {
					parts.push(school.school.name);
				}
				if (school.schoolFaculty && school.schoolFaculty.name) {
					parts.push(school.schoolFaculty.name);
				}
				if (school.status) {
					const statusMap: Record<string, string> = {
						completed: "Absolvent",
						in_progress: "Studuje",
						in_progress_1: "1. ročník",
						in_progress_2: "2. ročník",
						in_progress_3: "3. ročník",
						in_progress_4: "4. ročník",
						in_progress_5: "5. ročník",
						in_progress_6: "6. ročník",
					};
					parts.push(statusMap[school.status] || school.status);
				}
				if (school.otherText) {
					parts.push(school.otherText);
				}
				return parts.join(", ");
			})
			.join("; ");
	};

	const formatExperience = (experience: Experience[]): string => {
		if (!experience || experience.length === 0) return "";
		return experience
			.map((exp) => {
				const parts: string[] = [];
				if (exp.title) parts.push(exp.title);
				if (exp.companyName) parts.push(exp.companyName);
				return parts.join(", ");
			})
			.join("; ");
	};

	const getStatusLabel = (candidateStatus: CandidateStatus | null): string => {
		if (!candidateStatus || !candidateStatus.status) return "";
		const statusVal = candidateStatus.status;
		const option = statusOptions.find(
			(o) => o.value === statusVal || o.employedStatus === statusVal,
		);
		return option?.label || "";
	};

	const downloadCSV = (): void => {
		const headers = [
			"Jméno",
			"Příjmení",
			"Telefon",
			"Email",
			"Popis",
			"Věk",
			"Zkušenosti",
			"Dovednosti",
			"Vzdělání",
			"Status",
			"Poznámka",
		];

		const csvString = [
			headers,
			...(data?.users || []).map((item: User) => [
				item.givenName,
				item.familyName,
				item.phone ? `\t${item.phone}` : "",
				item.email || "",
				item.description || "",
				item.age.toString(),
				formatExperience(item.experience),
				(item.skills || []).join("; "),
				formatSchools(item.userSchools),
				getStatusLabel(item.candidateStatus),
				item.candidateStatus?.note || "",
			]),
		]
			.map((row) =>
				row
					.map(
						(cell: string) =>
							`"${(cell || "").toString().replace(/"/g, '""')}"`,
					)
					.join(","),
			)
			.join("\n");

		const blob = new Blob(["\ufeff" + csvString], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName || "quickjobs_uchazeci_export.csv";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<Button
			disabled={isLoading || isError || !data?.users?.length || !queryParams}
			variant={"outline"}
			onClick={downloadCSV}
		>
			Exportovat uchazeče (CSV)
		</Button>
	);
};

export default ExportCSV;
