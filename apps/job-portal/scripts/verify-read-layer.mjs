import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..", "..", "..");

const checks = [
    {
        description: "direct quickjobs-api-wrapper imports outside legacy boundary",
        args: [
            "-n",
            'from "quickjobs-api-wrapper"|from \'quickjobs-api-wrapper\'',
            "apps/job-portal",
            "--glob",
            "!apps/job-portal/lib/legacyApi.ts",
            "--glob",
            "!apps/job-portal/scripts/verify-read-layer.mjs",
        ],
    },
    {
        description: "shared read hook imports",
        args: [
            "-n",
            'from "@ui/hooks/useGetProfile"|from "@ui/hooks/useJobs"|from "@ui/hooks/useExternalJobs"',
            "apps/job-portal",
            "--glob",
            "!apps/job-portal/scripts/verify-read-layer.mjs",
        ],
    },
    {
        description: "shared ServerProvider import",
        args: [
            "-n",
            'from "@ui/Providers/ServerProvider"',
            "apps/job-portal",
            "--glob",
            "!apps/job-portal/scripts/verify-read-layer.mjs",
        ],
    },
    {
        description: "unsafe @ui/helpers barrel imports",
        args: [
            "-n",
            'from "@ui/helpers"|from \'@ui/helpers\'',
            "apps/job-portal",
            "--glob",
            "!apps/job-portal/scripts/verify-read-layer.mjs",
        ],
    },
];

const failures = [];

for (const check of checks) {
    try {
        const output = execFileSync("rg", check.args, {
            cwd: workspaceRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();
        if (output) {
            failures.push(`${check.description}:\n${output}`);
        }
    } catch (error) {
        if (error.status === 1) {
            continue;
        }
        throw error;
    }
}

if (failures.length > 0) {
    console.error(failures.join("\n\n"));
    process.exit(1);
}

console.log("Read layer verification passed.");
