import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ imageId: string }>;
};

const favoriteSchema = z.object({ isFavorite: z.boolean() });

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to update your gallery." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = favoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid favorite state." }, { status: 400 });
  }

  const { imageId } = await params;
  const user = await getCurrentAppUser();
  const result = await prisma.generatedImage.updateMany({
    where: { id: imageId, project: { userId: user.id } },
    data: { isFavorite: parsed.data.isFavorite },
  });

  if (result.count !== 1) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  return NextResponse.json({ id: imageId, isFavorite: parsed.data.isFavorite });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to delete gallery images." }, { status: 401 });
  }

  const { imageId } = await params;
  const user = await getCurrentAppUser();
  const image = await prisma.generatedImage.findFirst({
    where: { id: imageId, project: { userId: user.id } },
    select: { id: true, publicId: true },
  });

  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  await prisma.generatedImage.delete({ where: { id: image.id } });

  let cleanupWarning: string | null = null;
  if (image.publicId) {
    try {
      const result = await getCloudinaryClient().uploader.destroy(
        image.publicId,
        { resource_type: "image", invalidate: true },
      );
      if (result.result !== "ok" && result.result !== "not found") {
        cleanupWarning = "The image was deleted, but its Cloudinary asset may need manual cleanup.";
        console.error("[DELETE /api/images/[imageId]] Cloudinary cleanup returned:", result.result);
      }
    } catch (error) {
      cleanupWarning = "The image was deleted, but its Cloudinary asset could not be removed.";
      console.error(
        "[DELETE /api/images/[imageId]] Cloudinary cleanup failed:",
        error instanceof Error ? error.message : "Unknown Cloudinary error",
      );
    }
  }

  return NextResponse.json({ deleted: true, imageId, cleanupWarning });
}
