import { S3StorageProvider } from "./s3";
import { StorageProvider, PresignedUploadResult, PlaybackResult } from "./types";
import path from "path";
import fs from "fs";

export * from "./types";
export * from "./s3";

class LocalStorageProvider implements StorageProvider {
  name = "local";

  isConfigured(): boolean {
    return true; // Always available as local development fallback
  }

  async createPresignedUploadUrl(params: {
    fileName: string;
    contentType: string;
    instituteId: string;
    fileSize?: number;
  }): Promise<PresignedUploadResult> {
    const ext = params.fileName.split(".").pop() || "mp4";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileKey = `${params.instituteId}_${timestamp}_${random}.${ext}`;

    // Upload goes to dedicated direct streaming endpoint
    return {
      uploadUrl: `/api/storage/local-upload?key=${encodeURIComponent(fileKey)}`,
      method: "POST",
      fileKey,
      publicUrl: `/api/storage/stream/${encodeURIComponent(fileKey)}`,
      isDirectS3: false,
    };
  }

  async createPlaybackUrl(params: {
    fileKey: string;
    videoUrl?: string;
    instituteId: string;
    expiresInSeconds?: number;
  }): Promise<PlaybackResult> {
    if (params.videoUrl && (params.videoUrl.startsWith("http://") || params.videoUrl.startsWith("https://"))) {
      return {
        playbackUrl: params.videoUrl,
        isSigned: false,
      };
    }

    const streamUrl = `/api/storage/stream/${encodeURIComponent(params.fileKey)}`;
    return {
      playbackUrl: streamUrl,
      isSigned: false,
    };
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      const sanitizedKey = path.basename(fileKey);
      const filePath = path.join(process.cwd(), "public", "uploads", "videos", sanitizedKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return true;
    } catch (err) {
      console.error("Local file delete error:", err);
      return false;
    }
  }
}

const s3Provider = new S3StorageProvider();
const localProvider = new LocalStorageProvider();

export function getStorageProvider(): StorageProvider {
  if (s3Provider.isConfigured()) {
    return s3Provider;
  }
  return localProvider;
}

export async function getPresignedVideoUploadUrl(params: {
  fileName: string;
  contentType: string;
  instituteId: string;
  fileSize?: number;
}): Promise<PresignedUploadResult> {
  const provider = getStorageProvider();
  return provider.createPresignedUploadUrl(params);
}

export async function getVideoPlaybackUrl(params: {
  fileKey: string;
  videoUrl?: string;
  instituteId: string;
  expiresInSeconds?: number;
}): Promise<PlaybackResult> {
  const provider = getStorageProvider();
  return provider.createPlaybackUrl(params);
}

export async function deleteStoredVideo(fileKey?: string | null): Promise<boolean> {
  if (!fileKey) return true;
  const provider = getStorageProvider();
  return provider.deleteFile(fileKey);
}
