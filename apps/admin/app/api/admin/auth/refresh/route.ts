import { NextRequest } from "next/server";
import { proxyAdminAuthRequest } from "@/lib/auth/adminAuthProxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyAdminAuthRequest(request, "/admin/auth/refresh");
}
