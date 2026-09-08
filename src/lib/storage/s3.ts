import crypto from "crypto";
import { StorageProvider, PresignedUploadResult, PlaybackResult } from "./types";

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmacSha256(`AWS4${key}`, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  return hmacSha256(kService, "aws4_request");
}

export class S3StorageProvider implements StorageProvider {
  name = "s3";
  private bucket: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private endpoint?: string;
  private publicDomain?: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.R2_BUCKET || "";
    this.region = process.env.S3_REGION || process.env.AWS_REGION || "auto";
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
    this.endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT; // e.g. https://<account>.r2.cloudflarestorage.com
    this.publicDomain = process.env.S3_PUBLIC_DOMAIN;
  }

  isConfigured(): boolean {
    return Boolean(this.bucket && this.accessKeyId && this.secretAccessKey);
  }

  private getHostAndPath(fileKey: string): { host: string; path: string; baseUrl: string } {
    let host = "";
    let path = `/${this.bucket}/${fileKey}`;
    let baseUrl = "";

    if (this.endpoint) {
      const urlObj = new URL(this.endpoint);
      host = urlObj.host;
      baseUrl = `${urlObj.protocol}//${host}`;
      path = `/${this.bucket}/${fileKey}`.replace(/\/+/g, "/");
    } else {
      host = `${this.bucket}.s3.${this.region}.amazonaws.com`;
      path = `/${fileKey}`;
      baseUrl = `https://${host}`;
    }

    return { host, path, baseUrl };
  }

  private signUrl(
    method: "GET" | "PUT",
    fileKey: string,
    expiresInSeconds: number,
    extraSignedHeaders: Record<string, string> = {}
  ): string {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);
    const service = "s3";

    const { host, path, baseUrl } = this.getHostAndPath(fileKey);

    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;

    const signedHeaderKeys = ["host", ...Object.keys(extraSignedHeaders).map((k) => k.toLowerCase())].sort();
    const signedHeaders = signedHeaderKeys.join(";");

    const queryParams: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${this.accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": expiresInSeconds.toString(),
      "X-Amz-SignedHeaders": signedHeaders,
    };

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join("&");

    const headerList: string[] = [`host:${host}`];
    for (const [k, v] of Object.entries(extraSignedHeaders)) {
      if (k.toLowerCase() !== "host") {
        headerList.push(`${k.toLowerCase()}:${v.trim()}`);
      }
    }
    headerList.sort();
    const canonicalHeaders = headerList.join("\n") + "\n";

    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join("\n");

    const signingKey = getSignatureKey(this.secretAccessKey, dateStamp, this.region, service);
    const signature = hmacSha256(signingKey, stringToSign).toString("hex");

    return `${baseUrl}${path}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  async createPresignedUploadUrl(params: {
    fileName: string;
    contentType: string;
    instituteId: string;
    fileSize?: number;
  }): Promise<PresignedUploadResult> {
    const ext = params.fileName.split(".").pop() || "mp4";
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");
    const fileKey = `institutes/${params.instituteId}/recorded-classes/${timestamp}-${random}.${ext}`;

    const expiresInSeconds = 3600; // 1 hour for large direct upload
    const uploadUrl = this.signUrl("PUT", fileKey, expiresInSeconds);

    const publicUrl = this.publicDomain
      ? `${this.publicDomain.replace(/\/$/, "")}/${fileKey}`
      : this.getHostAndPath(fileKey).baseUrl + this.getHostAndPath(fileKey).path;

    return {
      uploadUrl,
      method: "PUT",
      fileKey,
      publicUrl,
      isDirectS3: true,
      headers: {
        "Content-Type": params.contentType || "video/mp4",
      },
    };
  }

  async createPlaybackUrl(params: {
    fileKey: string;
    videoUrl?: string;
    instituteId: string;
    expiresInSeconds?: number;
  }): Promise<PlaybackResult> {
    if (!this.isConfigured() && params.videoUrl) {
      return { playbackUrl: params.videoUrl, isSigned: false };
    }

    const expiry = params.expiresInSeconds || 14400; // 4 hours for smooth viewing session
    const signedUrl = this.signUrl("GET", params.fileKey, expiry);
    const expiresAt = new Date(Date.now() + expiry * 1000).toISOString();

    return {
      playbackUrl: signedUrl,
      isSigned: true,
      expiresAt,
    };
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    if (!this.isConfigured() || !fileKey) return false;

    try {
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
      const dateStamp = amzDate.substring(0, 8);
      const service = "s3";
      const { host, path, baseUrl } = this.getHostAndPath(fileKey);

      const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;
      const signedHeaders = "host;x-amz-date";

      const emptyPayloadHash = sha256("");
      const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
      const canonicalRequest = ["DELETE", path, "", canonicalHeaders, signedHeaders, emptyPayloadHash].join("\n");
      const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");

      const signingKey = getSignatureKey(this.secretAccessKey, dateStamp, this.region, service);
      const signature = hmacSha256(signingKey, stringToSign).toString("hex");

      const authHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const res = await fetch(`${baseUrl}${path}`, {
        method: "DELETE",
        headers: {
          Host: host,
          "x-amz-date": amzDate,
          Authorization: authHeader,
        },
      });

      return res.ok || res.status === 204 || res.status === 404;
    } catch (err) {
      console.error("Failed to delete S3 file:", err);
      return false;
    }
  }
}
