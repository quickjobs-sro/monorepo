import { NextResponse } from "next/server";
import { reportError } from "../../../lib/reportError";
import { getBackendBaseUrl } from "../../../lib/backendConfig";

const TIMEOUT_MS = 5000;

interface StatusResponse {
  status: "up" | "down";
  responseTime: number | null;
  httpStatus?: number;
  error?: string;
}

export async function GET(): Promise<NextResponse<StatusResponse>> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const apiUrl = new URL("health", getBackendBaseUrl()).toString();

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "QuickJOBS-Status-Check",
      },
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (response.ok) {
      return NextResponse.json<StatusResponse>(
        {
          status: "up",
          responseTime,
          httpStatus: response.status,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // API responded but with non-OK status
    return NextResponse.json<StatusResponse>(
      {
        status: "down",
        responseTime: null,
        httpStatus: response.status,
        error: `HTTP ${response.status}`,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    reportError(error, { location: "api/status", endpoint: apiUrl });
    let errorMessage = "Neznámá chyba";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Timeout - žádná odezva do 5 sekund";
      } else if (
        error.name === "TypeError" ||
        error.message.includes("fetch") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND")
      ) {
        errorMessage = "Chyba připojení k API";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json<StatusResponse>(
      {
        status: "down",
        responseTime: null,
        error: errorMessage,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
