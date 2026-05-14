import type { JobLike } from "./openapi/types";

interface SEOContent {
  title: string;
  description: string;
  keywords: string[];
  metaDescription: string;
  faqSchema?: any;
  additionalSchema?: any;
  semanticContent?: string;
}

interface JobSEOParams {
  job: JobLike;
  jobTypeLabel: string;
  location?: string;
}

/**
 * Generate AI-enhanced SEO content for job listings
 * This can be extended to use OpenAI, Anthropic, or other AI services
 */
export async function generateJobSEO({
  job,
  jobTypeLabel,
  location = "Praha",
}: JobSEOParams): Promise<SEOContent> {
  // Extract key information
  const salary = job.salary
    ? `${job.salary}${(job as any).salary_to ? ` - ${(job as any).salary_to}` : ""} Kč`
    : null;
  const salaryType = job.salaryType === "hour" ? "hod." : job.salaryType === "total" ? "práci" : "měsíc";
  const address = job.place?.address || location;
  
  // Strip HTML tags for plain-text title/description extraction
  const plainDescription = job.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // Extract title from description (first sentence, max 60 chars for SEO)
  const sentences = plainDescription.split(/[.!?\n]/);
  const firstSentence = sentences[0] || plainDescription;
  const words = firstSentence.split(" ").filter(Boolean);
  const rawTitle = words.slice(0, 10).join(" ").substring(0, 60);
  const title = rawTitle.endsWith("...") ? rawTitle : rawTitle + (words.length > 10 ? "..." : "");

  // Generate SEO-optimized title
  const seoTitle = `${title} | ${jobTypeLabel} | ${address} | QuickJOBS.cz`;

  // Generate comprehensive meta description (150-160 chars optimal for SEO)
  const metaDescriptionParts: string[] = [];

  // Add job type and location
  metaDescriptionParts.push(`${jobTypeLabel} v ${address}`);

  // Add salary if available
  if (salary) {
    metaDescriptionParts.push(`plat ${salary} Kč/${salaryType}`);
  }

  // Add key details from description (first 80 chars)
  const descriptionPreview = plainDescription.substring(0, 80).replace(/\n/g, " ").trim();
  if (descriptionPreview) {
    metaDescriptionParts.push(descriptionPreview);
  }
  
  // Add call to action
  metaDescriptionParts.push("Přihlaste se přes mobilní aplikaci QuickJOBS.");
  
  // Combine and truncate to optimal length (155 chars)
  let metaDescription = metaDescriptionParts.join(" - ");
  if (metaDescription.length > 155) {
    metaDescription = metaDescription.substring(0, 152) + "...";
  }
  
  // Generate longer description for page content
  const fullDescription = `${jobTypeLabel} v ${address} s označením ${job.id}. ${descriptionPreview}${salary ? ` Plat ${salary} Kč/${salaryType}.` : ""} Zjistěte více a buďte zájemce o tuto nabídku práce v ${address} přes mobilní aplikaci QuickJOBS.`;
  
  // Generate SEO keywords
  const keywords = [
    jobTypeLabel.toLowerCase(),
    `práce ${address}`,
    `brigáda ${address}`,
    `zaměstnání ${address}`,
    "QuickJOBS",
    address,
    salary ? `plat ${salaryType}` : null,
    job.term === "one_time" ? "jednorázová brigáda" : null,
    job.term === "long_term" ? "dlouhodobá brigáda" : null,
    job.term === "full_time" ? "plný úvazek" : null,
    "hledám práci",
    "nabídky práce",
  ].filter(Boolean) as string[];
  
  // Generate FAQ schema for AI search engines
  const faqSchema = generateFAQSchema(job, jobTypeLabel, address, salary, salaryType);
  
  // Generate semantic content for AI understanding
  const semanticContent = generateSemanticContent(job, jobTypeLabel, address, salary, salaryType);
  
  return {
    title: seoTitle,
    description: fullDescription,
    metaDescription,
    keywords,
    faqSchema,
    semanticContent,
  };
}

/**
 * Generate AI-enhanced SEO content using an AI service (optional)
 * This function can be extended to call OpenAI, Anthropic, or other AI APIs
 */
export async function generateAISEO(params: JobSEOParams): Promise<SEOContent> {
  // Check if AI service is configured
  const aiApiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!aiApiKey) {
    // Fallback to rule-based SEO if no AI key is configured
    return generateJobSEO(params);
  }
  
  // TODO: Implement AI API call here
  // Example structure for OpenAI:
  // try {
  //   const response = await fetch('https://api.openai.com/v1/chat/completions', {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${aiApiKey}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       model: 'gpt-4',
  //       messages: [
  //         {
  //           role: 'system',
  //           content: 'You are an SEO expert specializing in Czech job listings. Generate optimized SEO content.',
  //         },
  //         {
  //           role: 'user',
  //           content: `Generate SEO-optimized title and description for this job: ${JSON.stringify(params)}`,
  //         },
  //       ],
  //     }),
  //   });
  //   const data = await response.json();
  //   // Parse and return AI-generated content
  //   return parseAIResponse(data);
  // } catch (error) {
  //   console.error('AI SEO generation failed, falling back to rule-based:', error);
  //   return generateJobSEO(params);
  // }
  
  // For now, fallback to rule-based SEO
  return generateJobSEO(params);
}

/**
 * Generate SEO-optimized keywords array
 */
export function generateSEOKeywords(
  jobType: string,
  location: string,
  salary?: number,
  salaryType?: string
): string[] {
  const keywords = [
    jobType.toLowerCase(),
    `práce ${location}`,
    `brigáda ${location}`,
    `zaměstnání ${location}`,
    "QuickJOBS",
    location,
    "hledám práci",
    "nabídky práce",
  ];
  
  if (salary && salaryType) {
    keywords.push(`plat ${salaryType}`);
  }
  
  return keywords;
}

/**
 * Generate FAQ schema for AI search engines (Google SGE, Perplexity, etc.)
 */
function generateFAQSchema(
  job: JobLike,
  jobTypeLabel: string,
  location: string,
  salary: string | null,
  salaryType: string
): any {
  const faqItems = [];
  
  // What is this job?
  faqItems.push({
    "@type": "Question",
    name: `Co je to za ${jobTypeLabel.toLowerCase()}?`,
    acceptedAnswer: {
      "@type": "Answer",
      text: `Toto je ${jobTypeLabel.toLowerCase()} v ${location}. ${job.description.substring(0, 200)}${job.description.length > 200 ? "..." : ""}`,
    },
  });
  
  // Where is the job located?
  if (job.place?.address) {
    faqItems.push({
      "@type": "Question",
      name: `Kde se nachází tato ${jobTypeLabel.toLowerCase()}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Práce se nachází v ${job.place.address}, ${location}.`,
      },
    });
  }
  
  // What is the salary?
  if (salary) {
    faqItems.push({
      "@type": "Question",
      name: `Jaký je plat pro tuto ${jobTypeLabel.toLowerCase()}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Plat pro tuto pozici je ${salary} Kč/${salaryType}.`,
      },
    });
  }
  
  // When does the job start?
  if (job.startsAt || (job as any).starts_at) {
    const startDate = new Date((job as any).starts_at || job.startsAt);
    faqItems.push({
      "@type": "Question",
      name: `Kdy začíná tato ${jobTypeLabel.toLowerCase()}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Práce začíná ${startDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}.`,
      },
    });
  }
  
  // What are the requirements?
  const requirements = (job as any).requirements || (job as any).skills || [];
  if (requirements.length > 0) {
    faqItems.push({
      "@type": "Question",
      name: `Jaké jsou požadavky pro tuto ${jobTypeLabel.toLowerCase()}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Požadavky: ${requirements.slice(0, 5).join(", ")}${requirements.length > 5 ? " a další." : "."}`,
      },
    });
  }
  
  // How to apply?
  faqItems.push({
    "@type": "Question",
    name: `Jak se přihlásit na tuto ${jobTypeLabel.toLowerCase()}?`,
    acceptedAnswer: {
      "@type": "Answer",
      text: `Přihlaste se na tuto nabídku práce přes mobilní aplikaci QuickJOBS, která je dostupná zdarma na App Store a Google Play.`,
    },
  });
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems,
  };
}

/**
 * Generate semantic content for AI search engines
 */
function generateSemanticContent(
  job: JobLike,
  jobTypeLabel: string,
  location: string,
  salary: string | null,
  salaryType: string
): string {
  const parts: string[] = [];
  
  // Job type and location
  parts.push(`Toto je ${jobTypeLabel.toLowerCase()} v ${location}.`);
  
  // Description summary
  const descriptionSummary = job.description.substring(0, 300).replace(/\n/g, " ").trim();
  parts.push(descriptionSummary);
  
  // Salary information
  if (salary) {
    parts.push(`Plat je ${salary} Kč/${salaryType}.`);
  }
  
  // Location details
  if (job.place?.address) {
    parts.push(`Místo práce: ${job.place.address}, ${location}.`);
  }
  
  // Start date
  if (job.startsAt || (job as any).starts_at) {
    const startDate = new Date((job as any).starts_at || job.startsAt);
    parts.push(`Začátek: ${startDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}.`);
  }
  
  // Requirements
  const requirements = (job as any).requirements || (job as any).skills || [];
  if (requirements.length > 0) {
    parts.push(`Požadavky: ${requirements.slice(0, 5).join(", ")}${requirements.length > 5 ? " a další" : ""}.`);
  }
  
  // Call to action
  parts.push("Pro přihlášení na tuto nabídku použijte mobilní aplikaci QuickJOBS.");
  
  return parts.join(" ");
}
