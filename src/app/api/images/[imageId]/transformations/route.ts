import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { ImagePreset } from "@/generated/prisma/client";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { getBackgroundPrompt, IMAGE_PRESETS } from "@/lib/cloudinary/presets";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ imageId: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to prepare image formats." }, { status: 401 });
  }

  const { imageId } = await params;
  const user = await getCurrentAppUser();
  const image = await prisma.generatedImage.findFirst({
    where: { id: imageId, project: { userId: user.id } },
    include: { project: { include: { originalImage: true } } },
  });

  if (!image || !image.project.originalImage) {
    return NextResponse.json({ error: "Generated image not found." }, { status: 404 });
  }

  let legacyBackgroundTransformation: Array<{ effect: string }> = [];
  if (!image.publicId) {
    try {
      const scenePrompt = getBackgroundPrompt(image.prompt);
      legacyBackgroundTransformation = [{
        effect: `gen_background_replace:prompt_${scenePrompt};seed_${image.variation}`,
      }];
    } catch (error) {
      console.error(
        "[POST /api/images/[imageId]/transformations] Invalid generation prompt:",
        error instanceof Error ? error.message : "Unknown prompt error",
      );
      return NextResponse.json(
        { error: "This image cannot be transformed because its scene data is missing." },
        { status: 422 },
      );
    }
  }

  try {
    const cloudinary = getCloudinaryClient();
    const transformations = (Object.entries(IMAGE_PRESETS) as [
      ImagePreset,
      (typeof IMAGE_PRESETS)[ImagePreset],
    ][]).map(([preset, dimensions]) => {
      const secureUrl = cloudinary.url(image.publicId ?? image.project.originalImage!.publicId, {
        secure: true,
        transformation: [
          ...legacyBackgroundTransformation,
          {
            width: dimensions.width,
            height: dimensions.height,
            crop: "fill",
            gravity: "auto",
          },
          { quality: "auto", fetch_format: "auto" },
        ],
      });

      return {
        generatedImageId: image.id,
        preset,
        secureUrl,
        width: dimensions.width,
        height: dimensions.height,
      };
    });

    await prisma.$transaction(
      transformations.map(({ generatedImageId, preset, ...data }) =>
        prisma.imageTransformation.upsert({
          where: { generatedImageId_preset: { generatedImageId, preset } },
          create: { generatedImageId, preset, ...data },
          update: data,
        }),
      ),
    );

    return NextResponse.json({
      transformations: transformations.map((transformation) => ({
        ...transformation,
        label: IMAGE_PRESETS[transformation.preset].label,
      })),
    });
  } catch (error) {
    console.error(
      "[POST /api/images/[imageId]/transformations] Transformation setup failed:",
      error instanceof Error ? error.message : "Unknown transformation error",
    );
    return NextResponse.json(
      { error: "Image formats could not be prepared. Please try again." },
      { status: 502 },
    );
  }
}
