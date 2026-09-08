export interface PresignedUploadResult {
  uploadUrl: string;
  method: "PUT" | "POST";
  fileKey: string;
  publicUrl: string;
  headers?: Record<string, string>;
  isDirectS3: boolean;
}

export interface PlaybackResult {
  playbackUrl: string;
  isSigned: boolean;
  expiresAt?: string;
}

export interface StorageConfig {
  provider: "s3" | "local";
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  publicDomain?: string;
}

export interface StorageProvider {
  name: string;
  isConfigured(): boolean;
  createPresignedUploadUrl(params: {
    fileName: string;
    contentType: string;
    instituteId: string;
    fileSize?: number;
  }): Promise<PresignedUploadResult>;
  createPlaybackUrl(params: {
    fileKey: string;
    videoUrl?: string;
    instituteId: string;
    expiresInSeconds?: number;
  }): Promise<PlaybackResult>;
  deleteFile(fileKey: string): Promise<boolean>;
}
