import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const baseURL = "http://localhost:3002";
const WAIT_WHEN_DOWN_MS = 5 * 60 * 1000; // 5 min
const MAX_WAIT_RETRIES = 2; // wait 5 min at most twice = 10 min
/** Timeout for single status check (avoid hanging). */
const STATUS_CHECK_TIMEOUT_MS = 10_000;
/** User-like: delay between pages (ms). */
const DELAY_BETWEEN_PAGES_MS = 6000;
/** Delay after loading a page before "doing" anything (ms). */
const DELAY_ON_PAGE_MS = 4000;
const SCENARIO_LOG_PATH = path.join(__dirname, "../../../.cursor/debug-e2e-user-like-scenario.log");

const PAGES = ["/", "/jobs", "/login", "/companies", "/my-jobs", "/status"] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function isBackendUp(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), STATUS_CHECK_TIMEOUT_MS);
        const res = await fetch(`${baseURL}/api/status`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        return res.ok && (data as { status?: string })?.status === "up";
    } catch {
        return false;
    }
}

function writeScenarioMessage(cs: string, en?: string): void {
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        scenarioCs: cs,
        ...(en ? { scenarioEn: en } : {}),
    }) + "\n";
    try {
        const dir = path.dirname(SCENARIO_LOG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(SCENARIO_LOG_PATH, line);
    } catch {
        // ignore
    }
}

test.describe("User-like recovery", () => {
    test("wait for BE up (5 min if down), then one user-like pass", async ({ page }) => {
        test.setTimeout(WAIT_WHEN_DOWN_MS * (MAX_WAIT_RETRIES + 1) + 120_000);

        let waited = 0;
        while (waited < MAX_WAIT_RETRIES) {
            if (await isBackendUp()) break;
            await sleep(WAIT_WHEN_DOWN_MS);
            waited++;
        }

        const up = await isBackendUp();
        if (!up) {
            writeScenarioMessage(
                "Scénář: Backend byl nedostupný i po čekání. Spusťte test později (např. za 5 min): yarn test:e2e:user-like",
                "Scenario: Backend still down after waiting. Run test later: yarn test:e2e:user-like"
            );
            throw new Error("Backend still down after waiting; run again later.");
        }

        for (const pagePath of PAGES) {
            await page.goto(pagePath, { waitUntil: "domcontentloaded", timeout: 25_000 });
            await sleep(DELAY_ON_PAGE_MS);
            await sleep(DELAY_BETWEEN_PAGES_MS);
        }

        writeScenarioMessage(
            "Scénář: Veřejné endpointy byly dostupné. Prošly stránky: úvod, nabídky, přihlášení, firmy, moje nabídky, stav API. Test proběhl úspěšně.",
            "Scenario: Public endpoints were up. Pages visited: home, jobs, login, companies, my-jobs, status. Test passed."
        );
    });
});
