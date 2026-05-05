import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const outputPath = path.join(appRoot, "openapi", "openapi.snapshot.json");
const sourceUrl = process.env.OPENAPI_URL || "http://localhost:3000/docs-json";

const response = await fetch(sourceUrl);
if (!response.ok) {
    throw new Error(`Failed to download OpenAPI JSON from ${sourceUrl}: HTTP ${response.status}`);
}

const json = await response.json();
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");

console.log(`OpenAPI snapshot updated: ${outputPath}`);

