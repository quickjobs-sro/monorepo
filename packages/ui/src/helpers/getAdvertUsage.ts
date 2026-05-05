import { AccountInfo } from "quickjobs-api-wrapper";

type CreditType = "oneTime" | "longTerm" | "fullTime";

type CreditUsage = { remaining: number; total: number };

interface PackageUsage {
  packageId: number;
  endsAt: string;
  usage: CreditUsage;
}

export const getPackageUsages = (
  servicePackages: AccountInfo["service"]["packages"],
  userPackages: AccountInfo["userPackages"],
  creditType: CreditType
): PackageUsage[] => {
  const servicePackageMap = Object.fromEntries(
    servicePackages.map((pkg) => [pkg.id, pkg.jobCredits])
  );

  return userPackages
    .filter((pkg) => servicePackageMap[pkg.packageId])
    .map((pkg) => {
      const totalCredits = servicePackageMap[pkg.packageId];

      const usage: CreditUsage = {
        remaining: pkg.jobCredits[creditType] || 0,
        total: totalCredits?.[creditType] || 0,
      };

      return {
        packageId: pkg.packageId,
        endsAt: pkg.endsAt,
        usage,
      };
    })
    .filter((pkg) => pkg.usage.total > 0);
};
