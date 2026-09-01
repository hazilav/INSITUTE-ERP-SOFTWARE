import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: authContext.user,
      institute: authContext.institute,
    });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
