import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden: Students cannot delete documents." }, { status: 403 });
    }

    const doc = await db.studentDocument.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await db.studentDocument.delete({ where: { id: doc.id } });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE Student Document API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete document" }, { status: 500 });
  }
}
