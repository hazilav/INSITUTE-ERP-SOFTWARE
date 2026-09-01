import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TemplateParams {
  params: { id: string };
}

export async function PUT(request: Request, { params }: TemplateParams) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, subject, body_template, placeholders } = body;

    const existing = await db.messageTemplate.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updated = await db.messageTemplate.update({
      where: { id: existing.id },
      data: {
        name: name ? name.trim() : existing.name,
        category: category || existing.category,
        subject: subject !== undefined ? subject?.trim() : existing.subject,
        body_template: body_template ? body_template.trim() : existing.body_template,
        placeholders: placeholders !== undefined ? placeholders?.trim() : existing.placeholders,
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error("PUT Message Template error:", error);
    return NextResponse.json({ error: error.message || "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: TemplateParams) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await db.messageTemplate.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await db.messageTemplate.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error: any) {
    console.error("DELETE Message Template error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete template" }, { status: 500 });
  }
}
