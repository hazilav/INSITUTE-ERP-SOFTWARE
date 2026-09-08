import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getMime(ext: string): string {
  switch (ext) {
    case ".mp4":
    case ".m4v":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mkv":
      return "video/x-matroska";
    case ".mov":
      return "video/quicktime";
    case ".avi":
      return "video/x-msvideo";
    default:
      return "video/mp4";
  }
}

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return new Response("Unauthorized", { status: 401 });
    }

    const safeKey = path.basename(decodeURIComponent(params.key));
    const filePath = path.join(process.cwd(), "public", "uploads", "videos", safeKey);

    if (!fs.existsSync(filePath)) {
      return new Response("Video not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = request.headers.get("range");
    const mimeType = getMime(path.extname(filePath).toLowerCase());

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const headers = new Headers({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": mimeType,
      });

      // @ts-ignore - ReadableStream conversion
      return new Response(fileStream as any, {
        status: 206,
        headers,
      });
    } else {
      const headers = new Headers({
        "Content-Length": fileSize.toString(),
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
      });

      const fileStream = fs.createReadStream(filePath);
      // @ts-ignore
      return new Response(fileStream as any, {
        status: 200,
        headers,
      });
    }
  } catch (error: any) {
    console.error("Stream video error:", error);
    return new Response("Error streaming video", { status: 500 });
  }
}
