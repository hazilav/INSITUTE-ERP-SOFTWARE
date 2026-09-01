import { NextResponse } from "next/server";
import { getAuthenticatedUser, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized session. Please log in." }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Confirmation email is required." },
        { status: 400 }
      );
    }

    // Verify confirmation email matches current user email
    if (email.trim().toLowerCase() !== authContext.user.email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Confirmation email does not match your account email address." },
        { status: 400 }
      );
    }

    // Check OWNER protection rule
    if (authContext.user.role === "OWNER") {
      const ownerCount = await db.user.count({
        where: {
          institute_id: authContext.institute.id,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          {
            error:
              "You are the only owner of this institute. Transfer ownership to another administrator before deleting your account.",
          },
          { status: 400 }
        );
      }
    }

    // Delete user record safely from database
    await db.user.delete({
      where: { id: authContext.user.id },
    });

    // Clear session cookie
    await destroySession();

    return NextResponse.json({
      success: true,
      message: "Your account has been deleted successfully.",
      redirectUrl: "/login?deleted=true",
    });
  } catch (error: any) {
    console.error("Account Deletion Error:", error);
    return NextResponse.json(
      { error: formatErrorMessage(error, "Unable to delete your account right now. Please try again.") },
      { status: 500 }
    );
  }
}
