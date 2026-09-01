import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Allowed Extensions & Max Size (10MB)
    const allowedExtensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".zip"];
    const ext = path.extname(file.name).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file format. Allowed: PDF, DOC, DOCX, JPG, PNG, ZIP." },
        { status: 400 }
      );
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "File size exceeds maximum 10MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads/activities
    const uploadDir = path.join(process.cwd(), "public", "uploads", "activities");
    await mkdir(uploadDir, { recursive: true });

    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/activities/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
