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

    const { role } = authContext.user;
    if (role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden: Students cannot upload videos." }, { status: 403 });
    }

    const url = new URL(request.url);
    const keyParam = url.searchParams.get("key");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const safeKey = keyParam ? path.basename(keyParam) : `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "videos");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const targetPath = path.join(uploadDir, safeKey);
    await writeFile(targetPath, buffer);

    const publicUrl = `/api/storage/stream/${encodeURIComponent(safeKey)}`;

    return NextResponse.json({
      success: true,
      fileKey: safeKey,
      publicUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Local video upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload video" },
      { status: 500 }
    );
  }
}
