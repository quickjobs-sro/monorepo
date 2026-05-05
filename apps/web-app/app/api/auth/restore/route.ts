import { NextRequest, NextResponse } from "next/server";
import API from "quickjobs-api-wrapper";

export async function POST(request: NextRequest) {
  try {
    const userToken = request.cookies.get("QuickJobs.tokens");

    if (!userToken || !userToken.value) {
      return NextResponse.json({ error: "No token found" }, { status: 401 });
    }

    const parsedToken = JSON.parse(userToken.value);
    const restoredToken = API.restoreUserToken(parsedToken);

    const response = NextResponse.json({ success: true });

    // Update the cookie with the restored token
    response.cookies.set({
      name: "QuickJobs.tokens",
      value: JSON.stringify(restoredToken),
      secure: true,
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("Token restoration error:", error);

    const response = NextResponse.json(
      { error: "Invalid token" },
      { status: 401 }
    );
    response.cookies.delete("QuickJobs.tokens");

    return response;
  }
}
