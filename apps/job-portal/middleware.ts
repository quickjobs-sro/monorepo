import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Add your middleware logic here
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|img|logo.svg|companies|jobs/detail).*)',
  ],
};

