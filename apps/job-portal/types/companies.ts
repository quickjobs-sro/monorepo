export interface OfferType {
    id: number;
    name?: string | null;
    label?: string | null;
}

export interface CompanyOffer {
    id: number;
    offerType: OfferType;
}

export interface CompanyContact {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone?: string | null;
}

export interface CompanyWebsite {
    id: number;
    name: string;
    url: string;
    sortOrder: number;
}

export interface Company {
    id: number;
    name: string;
    slug?: string | null;
    logo?: string | null;
    shortDescription?: string | null;
    location?: string | null;
    studentAudienceNotes?: string[] | null;
    sortOrder?: number;
    companyOffers?: CompanyOffer[] | null;
    contacts?: CompanyContact[] | null;
    websites?: CompanyWebsite[] | null;
}

/**
 * Stub type for future backend endpoint: API.companies.getCompanyJobs()
 * Replace with actual Job type from quickjobs-api-wrapper when endpoint is ready.
 */
export interface CompanyJobEntry {
    id: number;
    status: "active" | "inactive" | "completed";
}

export interface CompanyJobsResponse {
    /** Jobs with status === "active" */
    activeJobs: CompanyJobEntry[];
    /** Jobs with status !== "active" */
    inactiveJobs: CompanyJobEntry[];
}
