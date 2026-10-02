import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
};

function getImageFormat(bytes: Buffer): "jpg" | "png" | "webp" | null {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

function uploadToCloudinary(
  buffer: Buffer,
  format: "jpg" | "png" | "webp",
  clerkUserId: string,
): Promise<CloudinaryUploadResult> {
  const cloudinary = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "snapstudio/originals",
        resource_type: "image",
        format,
        tags: ["snapstudio", "original"],
        context: { clerk_user_id: clerkUserId },
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.public_id || !result.secure_url) {
          reject(new Error("Cloudinary returned an incomplete upload result."));
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to upload a product image." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 256 * 1024) {
    return NextResponse.json(
      { error: "This upload is larger than the 10 MB limit." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "The upload form could not be read. Please choose an image and try again." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }

  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Upload a PNG, JPG, or WEBP file." },
      { status: 415 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The selected image is empty." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "This image is larger than the 10 MB limit." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const format = getImageFormat(buffer);
  const expectedFormat = file.type === "image/jpeg" ? "jpg" : file.type.slice("image/".length);

  if (!format || format !== expectedFormat) {
    return NextResponse.json(
      { error: "The file contents do not match a valid PNG, JPG, or WEBP image." },
      { status: 415 },
    );
  }

  let cloudinaryImage: CloudinaryUploadResult;
  try {
    cloudinaryImage = await uploadToCloudinary(buffer, format, userId);
  } catch (error) {
    console.error(
      "[POST /api/upload] Cloudinary upload failed:",
      error instanceof Error ? error.message : "Unknown Cloudinary error",
    );
    return NextResponse.json(
      { error: "Cloudinary could not upload this image. Please try again." },
      { status: 502 },
    );
  }

  try {
    const user = await getCurrentAppUser();
    const submittedName = formData.get("projectName");
    const projectName =
      typeof submittedName === "string" && submittedName.trim()
        ? submittedName.trim().slice(0, 80)
        : "New photoshoot";

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: projectName,
        status: "DRAFT",
        originalImage: {
          create: {
            publicId: cloudinaryImage.public_id,
            secureUrl: cloudinaryImage.secure_url,
            format: cloudinaryImage.format,
            width: cloudinaryImage.width,
            height: cloudinaryImage.height,
            bytes: cloudinaryImage.bytes,
          },
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ projectId: project.id }, { status: 201 });
  } catch (error) {
    console.error(
      "[POST /api/upload] Failed to persist uploaded image:",
      error instanceof Error ? error.message : "Unknown database error",
    );

    try {
      await getCloudinaryClient().uploader.destroy(cloudinaryImage.public_id, {
        resource_type: "image",
        invalidate: true,
      });
    } catch (cleanupError) {
      console.error(
        "[POST /api/upload] Cloudinary cleanup failed:",
        cleanupError instanceof Error ? cleanupError.message : "Unknown cleanup error",
      );
    }

    return NextResponse.json(
      { error: "The image uploaded, but the project could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
