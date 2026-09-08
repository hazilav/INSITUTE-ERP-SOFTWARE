import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getPresignedVideoUploadUrl } from "@/lib/storage";

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

    const body = await request.json();
    const { fileName, contentType, fileSize } = body;

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    // Validate file extension for videos
    const ext = fileName.split(".").pop()?.toLowerCase();
    const allowedVideoExts = ["mp4", "webm", "mkv", "mov", "avi", "m4v"];
    if (!ext || !allowedVideoExts.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid video file format. Supported formats: MP4, WebM, MKV, MOV, AVI, M4V." },
        { status: 400 }
      );
    }

    const result = await getPresignedVideoUploadUrl({
      fileName,
      contentType: contentType || "video/mp4",
      instituteId: authContext.institute.id,
      fileSize: typeof fileSize === "number" ? fileSize : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Presigned upload URL generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
