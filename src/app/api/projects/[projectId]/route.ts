import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to view this project." }, { status: 401 });
  }

  const { projectId } = await params;
  const user = await getCurrentAppUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      originalImage: true,
      generatedImages: {
        orderBy: [{ createdAt: "desc" }, { scene: "asc" }, { variation: "desc" }],
        include: { presets: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: project.id,
    name: project.name,
    status: project.status,
    errorMessage: project.errorMessage,
    prompt: project.prompt,
    detections: {
      category: project.detectedCategory,
      color: project.detectedColor,
      material: project.detectedMaterial,
      style: project.detectedStyle,
      product: project.detectedProduct,
    },
    originalImage: project.originalImage,
    generatedImages: project.generatedImages.map((image) => ({
      id: image.id,
      secureUrl: image.secureUrl,
      scene: image.scene,
      variation: image.variation,
      prompt: image.prompt,
      isFavorite: image.isFavorite,
      createdAt: image.createdAt,
      project: { id: project.id, name: project.name },
      presets: image.presets,
    })),
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to delete this project." }, { status: 401 });
  }

  const { projectId } = await params;
  const user = await getCurrentAppUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: {
      id: true,
      originalImage: { select: { publicId: true } },
      generatedImages: { select: { publicId: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  await prisma.project.delete({ where: { id: project.id } });

  let cleanupWarning: string | null = null;
  const publicIds = [
    project.originalImage?.publicId,
    ...project.generatedImages.map((image) => image.publicId),
  ].filter((publicId): publicId is string => Boolean(publicId));
  const cleanupResults = await Promise.allSettled(
    publicIds.map(async (publicId) =>
      getCloudinaryClient().uploader.destroy(
        publicId,
        { resource_type: "image", invalidate: true },
      ),
    ),
  );
  cleanupResults.forEach((result) => {
    if (result.status === "rejected") {
      cleanupWarning = "The project was deleted, but one or more Cloudinary images could not be removed.";
      console.error(
        "[DELETE /api/projects/[projectId]] Cloudinary cleanup failed:",
        result.reason instanceof Error ? result.reason.message : "Unknown Cloudinary error",
      );
    } else if (result.value.result !== "ok" && result.value.result !== "not found") {
      cleanupWarning = "The project was deleted, but one or more Cloudinary images may need manual cleanup.";
      console.error(
        "[DELETE /api/projects/[projectId]] Cloudinary cleanup returned:",
        result.value.result,
      );
    }
  });

  return NextResponse.json({ deleted: true, projectId: project.id, cleanupWarning });
}
