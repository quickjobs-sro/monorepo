import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const userToken = req.cookies.get("QuickJobs.tokens");

  if (!userToken || !userToken.value) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    // Just validate that the token is valid JSON
    JSON.parse(userToken.value);

    // Let the API route handle token restoration and validation
    return NextResponse.next();
  } catch (error) {
    // Invalid JSON, redirect to login
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.delete("QuickJobs.tokens");
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"],
};
