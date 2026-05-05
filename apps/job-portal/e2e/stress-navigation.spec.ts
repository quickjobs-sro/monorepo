import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const DURATION_MS = 5 * 60 * 1000; // 5 min
const RUN_ID = process.env.STRESS_RUN_ID || "1";
const LOG_PATH = path.join(
    __dirname,
    "../../../.cursor/debug-e2e-stress-run" + RUN_ID + ".log"
);

const PAGES = ["/", "/jobs", "/login", "/companies", "/my-jobs", "/status"] as const;

/** Min delay after nav/refresh so we don't hammer the BE (ms). */
const DELAY_AFTER_NAV_MS = 2000;
/** Min delay between refreshes (ms). */
const DELAY_BETWEEN_REFRESH_MS = 1500;
/** Max refreshes per page (was 2–5). */
const MAX_REFRESHES_PER_PAGE = 2;
/** Ping /api/status at most every this many cycles. */
const STATUS_EVERY_N_CYCLES = 6;
/** Min time between two status pings (ms). */
const STATUS_COOLDOWN_MS = 25_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(
    type: "nav" | "request" | "response" | "status" | "error" | "refresh" | "crash" | "scenario",
    data: Record<string, unknown>
): void {
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        runId: RUN_ID,
        type,
        ...data,
    }) + "\n";
    try {
        fs.appendFileSync(LOG_PATH, line);
    } catch (e) {
        console.error("stress log write failed", e);
    }
}

test.describe("Stress navigation", () => {
    test("5min: cycle pages, refresh 2-5x, log all requests and status", async ({ page }, testInfo) => {
        test.setTimeout(DURATION_MS + 30_000);

        // Ensure log file exists and write header
        try {
            const dir = path.dirname(LOG_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(
                LOG_PATH,
                JSON.stringify({
                    ts: new Date().toISOString(),
                    runId: RUN_ID,
                    type: "start",
                    durationMin: 5,
                    baseURL: testInfo.project.use?.baseURL ?? "http://localhost:3002",
                }) + "\n"
            );
        } catch {
            // may fail if .cursor missing
        }

        let requestId = 0;
        page.on("request", (req) => {
            const url = req.url();
            const id = ++requestId;
            log("request", {
                id,
                method: req.method(),
                url: url.length > 200 ? url.slice(0, 200) + "..." : url,
                resourceType: req.resourceType(),
            });
        });

        page.on("response", (res) => {
            const req = res.request();
            const url = req.url();
            const ok = res.ok();
            const status = res.status();
            const isBackend =
                url.includes("api.quickjobs.cz")
                || url.includes("127.0.0.1:3000")
                || url.includes("localhost:3000")
                || /\/v[12]\//.test(url)
                || url.includes("/health");
            log("response", {
                id: requestId,
                method: req.method(),
                status,
                statusText: res.statusText(),
                url: url.length > 180 ? url.slice(0, 180) + "..." : url,
                ok,
                ...(isBackend && (!ok || status >= 500) ? { backendError: true, note: "BE 5xx or !ok" } : {}),
            });
        });

        page.on("pageerror", (err) => {
            log("error", {
                kind: "pageerror",
                message: err.message,
                stack: err.stack?.slice(0, 500),
            });
        });

        page.on("crash", () => {
            log("crash", { message: "page crashed" });
        });

        const baseURL = testInfo.project.use?.baseURL ?? "http://localhost:3002";
        const start = Date.now();
        let cycle = 0;
        let refreshCount = 0;

        while (Date.now() - start < DURATION_MS) {
            cycle++;
            const pagePath = PAGES[cycle % PAGES.length] ?? PAGES[0];

            log("nav", { cycle, path: pagePath });

            try {
                await page.goto(pagePath, { waitUntil: "domcontentloaded", timeout: 25_000 });
            } catch (e) {
                log("error", {
                    kind: "nav",
                    path: pagePath,
                    message: e instanceof Error ? e.message : String(e),
                });
            }
            await sleep(DELAY_AFTER_NAV_MS);

            const numRefreshes = 1 + Math.floor(Math.random() * MAX_REFRESHES_PER_PAGE);
            for (let r = 0; r < numRefreshes; r++) {
                if (Date.now() - start >= DURATION_MS) break;
                refreshCount++;
                log("refresh", { cycle, path: pagePath, refresh: r + 1, totalRefreshes: refreshCount });
                try {
                    await page.reload({ waitUntil: "domcontentloaded", timeout: 25_000 });
                } catch (e) {
                    log("error", {
                        kind: "refresh",
                        path: pagePath,
                        refresh: r + 1,
                        message: e instanceof Error ? e.message : String(e),
                    });
                }
                await sleep(DELAY_BETWEEN_REFRESH_MS);
            }

            const now = Date.now();
            const lastStatusAt = (globalThis as { _stressLastStatus?: number })._stressLastStatus ?? 0;
            const mayPingStatus =
                cycle % STATUS_EVERY_N_CYCLES === 0 && now - lastStatusAt >= STATUS_COOLDOWN_MS;
            if (mayPingStatus) {
                (globalThis as { _stressLastStatus?: number })._stressLastStatus = now;
                try {
                    const statusRes = await page.request.get(`${baseURL}/api/status`, { timeout: 10_000 });
                    const body = await statusRes.json().catch(() => ({}));
                    const up = statusRes.ok() && (body as { status?: string })?.status === "up";
                    log("status", {
                        cycle,
                        status: statusRes.status(),
                        ok: statusRes.ok(),
                        body: typeof body === "object" ? body : { raw: String(body).slice(0, 200) },
                    });
                    if (!up) {
                        log("nav", { cycle, stopped: true, reason: "Backend down, stopping test to avoid DDOS" });
                        log("scenario", {
                            scenarioCs: "Scénář: Backend přestal odpovídat (stav nebyl 'up'). Test byl zastaven, aby nedošlo k přetížení serveru. Počkejte cca 5 minut a spusťte: yarn test:e2e:user-like",
                            scenarioEn: "Scenario: Backend down. Test stopped to avoid DDOS. Wait ~5 min then run: yarn test:e2e:user-like",
                        });
                        break;
                    }
                } catch (e) {
                    log("status", {
                        cycle,
                        error: e instanceof Error ? e.message : String(e),
                        ok: false,
                    });
                    log("nav", { cycle, stopped: true, reason: "Status check failed, stopping test" });
                    log("scenario", {
                        scenarioCs: "Scénář: Kontrola stavu API selhala (timeout nebo chyba). Test byl zastaven. Počkejte a zkuste: yarn test:e2e:user-like",
                        scenarioEn: "Scenario: Status check failed. Test stopped. Wait and run: yarn test:e2e:user-like",
                    });
                    break;
                }
            }
        }

        log("nav", { cycle: "end", totalCycles: cycle, totalRefreshes: refreshCount, durationMs: Date.now() - start });
        log("scenario", {
            scenarioCs: cycle > 0
                ? "Scénář: Stress test dokončen (nebo zastaven). Veřejné endpointy byly během testu dostupné, dokud stav nevrátil 'down'."
                : "Scénář: Test nebyl spuštěn nebo byl okamžitě ukončen.",
            scenarioEn: "Scenario: Stress test finished or stopped. Public endpoints were up until status returned down.",
        });
    });
});
