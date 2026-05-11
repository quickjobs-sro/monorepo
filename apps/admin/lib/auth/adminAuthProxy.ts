import { NextRequest, NextResponse } from "next/server";
import { getApiRevision } from "@/lib/backendConfig";
import { buildUrl } from "@/lib/api/shared";
import { getAdminOAuthBasicAuthorizationHeader } from "./adminOAuth";

export async function proxyAdminAuthRequest(request: NextRequest, backendPath: string): Promise<NextResponse> {
  let authorization: string;
  try {
    authorization = getAdminOAuthBasicAuthorizationHeader();
  } catch {
    return NextResponse.json(
      {
        message: "Admin OAuth client credentials are not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const response = await fetch(buildUrl(backendPath), {
    method: "POST",
    cache: "no-store",
    headers: {
      "Authorization": authorization,
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      "X-Revision": getApiRevision(),
    },
    body: await request.text(),
  });

  const body = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  return new NextResponse(body, {
    status: response.status,
    headers,
  });
}
