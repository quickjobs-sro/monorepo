"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Circle } from "lucide-react";
import { Button } from "@ui/components/core/button";
import { reportError } from "../../lib/reportError";

interface ApiStatus {
    status: "up" | "down" | "checking";
    responseTime: number | null;
    lastChecked: Date | null;
    error?: string;
}

export default function StatusPage() {
    const [apiStatus, setApiStatus] = useState<ApiStatus>({
        status: "checking",
        responseTime: null,
        lastChecked: null,
    });
    const [isRefreshing, setIsRefreshing] = useState(false);

    const checkApiStatus = async (signal?: AbortSignal) => {
        setIsRefreshing(true);

        try {
            const response = await fetch("/api/status", {
                method: "GET",
                cache: "no-store",
                signal: signal ?? null,
            });

            if (signal?.aborted) return;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (signal?.aborted) return;

            setApiStatus({
                status: data.status,
                responseTime: data.responseTime,
                lastChecked: new Date(),
                error: data.error,
            });
            lastStatusDownRef.current = data.status !== "up";
        } catch (error) {
            if (signal?.aborted) return;
            reportError(error, { location: "StatusPage.checkApiStatus" });
            let errorMessage = "Neznámá chyba";
            if (error instanceof Error) {
                errorMessage = error.name === "AbortError" ? "Zrušeno" : error.message;
            }

            setApiStatus({
                status: "down",
                responseTime: null,
                lastChecked: new Date(),
                error: errorMessage,
            });
            lastStatusDownRef.current = true;
        } finally {
            if (!signal?.aborted) setIsRefreshing(false);
        }
    };

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastStatusDownRef = useRef(false);

    useEffect(() => {
        const controller = new AbortController();
        const INTERVAL_UP_MS = 30_000;
        const INTERVAL_DOWN_MS = 60_000;

        const run = async () => {
            await checkApiStatus(controller.signal);
            const delay = lastStatusDownRef.current ? INTERVAL_DOWN_MS : INTERVAL_UP_MS;
            intervalRef.current = setTimeout(run, delay);
        };

        run();
        return () => {
            controller.abort();
            if (intervalRef.current) clearTimeout(intervalRef.current);
        };
    }, []);

    const STATUS_STUCK_MS = 10000;
    const stuckLoggedRef = useRef(false);
    useEffect(() => {
        if (apiStatus.status !== "checking") {
            stuckLoggedRef.current = false;
            return;
        }
        const t = setTimeout(() => {
            if (!stuckLoggedRef.current) {
                stuckLoggedRef.current = true;
            }
        }, STATUS_STUCK_MS);
        return () => clearTimeout(t);
    }, [apiStatus.status]);

    const getStatusColor = () => {
        switch (apiStatus.status) {
            case "up":
                return "text-green-600";
            case "down":
                return "text-red-600";
            default:
                return "text-gray-600";
        }
    };

    const getStatusIcon = () => {
        switch (apiStatus.status) {
            case "up":
                return <CheckCircle2 className="w-8 h-8 text-green-600" />;
            case "down":
                return <XCircle className="w-8 h-8 text-red-600" />;
            default:
                return <Loader2 className="w-8 h-8 animate-spin text-gray-600" />;
        }
    };

    const formatLastChecked = (date: Date | null) => {
        if (!date) return "Nikdy";
        return new Intl.DateTimeFormat("cs-CZ", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).format(date);
    };

    const getStatusTitleIcon = () => {
        switch (apiStatus.status) {
            case "up":
                return "🟢";
            case "down":
                return "🔴";
            default:
                return "⚪";
        }
    };


    useEffect(() => {
        const titleIcon = getStatusTitleIcon();
        const statusText = apiStatus.status === "up" ? "Dostupné" : apiStatus.status === "down" ? "Nedostupné" : "Kontroluji...";
        document.title = `${titleIcon} Stav API | QuickJOBS ${statusText}`;
    }, [apiStatus.status]);

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 px-6 md:px-16 max-w-full pt-4 md:pt-36 pb-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">Stav API</h1>

                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                {getStatusIcon()}
                                <div>
                                    <h2 className="text-xl font-semibold">API QuickJOBS</h2>
                                </div>
                            </div>
                            <Button
                                onClick={() => checkApiStatus()}
                                disabled={isRefreshing}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                                />
                                Aktualizovat
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                <span className="text-gray-600">Stav:</span>
                                <span className={`font-semibold ${getStatusColor()}`}>
                                    {apiStatus.status === "up"
                                        ? "Dostupné"
                                        : apiStatus.status === "down"
                                            ? "Nedostupné"
                                            : "Kontroluji..."}
                                </span>
                            </div>

                            {apiStatus.responseTime !== null && (
                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-gray-600">Doba odezvy:</span>
                                    <span className="font-semibold">{apiStatus.responseTime} ms</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                <span className="text-gray-600">Poslední kontrola:</span>
                                <span className="font-semibold">
                                    {formatLastChecked(apiStatus.lastChecked)}
                                </span>
                            </div>

                            {apiStatus.error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-800">
                                        <strong>Chyba:</strong> {apiStatus.error}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 text-sm text-gray-500 text-center">
                        Stránka se automaticky aktualizuje každých 30 sekund
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
