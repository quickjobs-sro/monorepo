import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const outputPath = path.join(appRoot, "openapi", "openapi.snapshot.json");
const sourceUrl = process.env.OPENAPI_URL || "https://backend.quickjobs.cz/docs-json";
const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync("curl", ["-fsSL", sourceUrl], {
    maxBuffer: 10 * 1024 * 1024,
});
const json = JSON.parse(stdout);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");

console.log(`OpenAPI snapshot updated: ${outputPath}`);
