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
    const folderType = (formData.get("type") as string) || "activities";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Allowed Extensions & Max Size (10MB default, 5MB for logos)
    const allowedExtensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp", ".zip"];
    const ext = path.extname(file.name).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file format. Allowed: PNG, JPG, JPEG, WebP, PDF, DOC, DOCX, ZIP." },
        { status: 400 }
      );
    }

    const maxSizeBytes = folderType === "logos" ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for logos, 10MB general
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size exceeds maximum ${folderType === "logos" ? "5MB" : "10MB"} limit.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine subfolder (logos vs activities)
    const safeSubFolder = folderType === "logos" ? "logos" : "activities";
    const uploadDir = path.join(process.cwd(), "public", "uploads", safeSubFolder);
    await mkdir(uploadDir, { recursive: true });

    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${safeSubFolder}/${uniqueFilename}`;

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
