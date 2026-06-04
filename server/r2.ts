import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.CLOUDFLARE_R2_REGION || "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";

export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const uniqueFileName = `${timestamp}-${randomStr}-${fileName}`;
    const key = `uploads/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    // Return public URL
    const publicUrl = `${PUBLIC_URL}/${key}`;
    return publicUrl;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error("Failed to upload file to R2");
  }
}

export async function deleteFromR2(fileUrl: string): Promise<void> {
  try {
    // Extract key from URL
    if (!fileUrl.startsWith(PUBLIC_URL)) {
      console.warn("File URL does not match R2 public URL");
      return;
    }

    const key = fileUrl.substring(PUBLIC_URL.length + 1);

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error("Failed to delete file from R2");
  }
}
