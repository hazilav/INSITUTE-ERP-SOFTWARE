import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { seedDefaultMessageTemplates } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    await seedDefaultMessageTemplates(institute.id);

    const templates = await db.messageTemplate.findMany({
      where: { institute_id: institute.id },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error("GET Message Templates error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch message templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, subject, body_template, placeholders } = body;

    if (!name || !body_template) {
      return NextResponse.json({ error: "Template Name and Body Template are required." }, { status: 400 });
    }

    const existing = await db.messageTemplate.findUnique({
      where: {
        institute_id_name: {
          institute_id: institute.id,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "A template with this name already exists." }, { status: 400 });
    }

    const template = await db.messageTemplate.create({
      data: {
        institute_id: institute.id,
        name: name.trim(),
        category: category || "System",
        subject: subject?.trim() || null,
        body_template: body_template.trim(),
        placeholders: placeholders?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("POST Message Template error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create message template" },
      { status: 500 }
    );
  }
}
