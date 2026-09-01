import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

function getMimeFromExt(ext: string): string {
  switch (ext) {
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    case ".avif":
      return "image/avif";
    case ".ico":
      return "image/x-icon";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

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

    const ext = path.extname(file.name).toLowerCase();

    // Allowed logo formats: JPG, JPEG, PNG, WEBP, GIF, SVG, BMP, TIFF, TIF, AVIF, ICO
    const allowedLogoExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".svg",
      ".bmp",
      ".tiff",
      ".tif",
      ".avif",
      ".ico",
    ];
    const allowedGeneralExtensions = [".pdf", ".doc", ".docx", ".zip", ...allowedLogoExtensions];

    const allowedExtensions = folderType === "logos" ? allowedLogoExtensions : allowedGeneralExtensions;

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        {
          error:
            folderType === "logos"
              ? "Invalid image format. Supported: JPG, JPEG, PNG, WEBP, GIF, SVG, BMP, TIFF, AVIF, ICO."
              : "Invalid file format.",
        },
        { status: 400 }
      );
    }

    // 20 MB max for logos, 10 MB for general files
    const maxSizeBytes = folderType === "logos" ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size exceeds maximum ${folderType === "logos" ? "20MB" : "10MB"} limit.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);

    // Sanitize SVG files securely before saving
    if (ext === ".svg") {
      let content = buffer.toString("utf8");
      content = content
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
        .replace(/on\w+\s*=\s*[^>\s]+/gi, "")
        .replace(/javascript\s*:/gi, "");
      buffer = Buffer.from(content, "utf8");
    }

    // Save file to disk or fallback to Data URL for serverless environments (Vercel / AWS Lambda)
    const safeSubFolder = folderType === "logos" ? "logos" : "activities";
    let publicUrl = "";

    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", safeSubFolder);
      await mkdir(uploadDir, { recursive: true });

      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      await writeFile(filePath, buffer);

      publicUrl = `/uploads/${safeSubFolder}/${uniqueFilename}`;
    } catch (fsErr: any) {
      console.warn("Disk write unavailable (Vercel serverless / read-only filesystem), using Data URL fallback:", fsErr);
      const mimeType = file.type || getMimeFromExt(ext);
      publicUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

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
