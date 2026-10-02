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

export async function GET(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to download this image." }, { status: 401 });
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

  const { searchParams } = new URL(request.url);
  const requestedPreset = searchParams.get("preset") as ImagePreset | null;
  if (requestedPreset && !Object.hasOwn(IMAGE_PRESETS, requestedPreset)) {
    return NextResponse.json({ error: "Choose a supported image format." }, { status: 400 });
  }
  const preset = requestedPreset;
  const dimensions = preset ? IMAGE_PRESETS[preset] : null;

  try {
    const legacyBackgroundTransformation = image.publicId
      ? []
      : [{
          effect: `gen_background_replace:prompt_${getBackgroundPrompt(image.prompt)};seed_${image.variation}`,
        }];
    const downloadUrl = getCloudinaryClient().url(
      image.publicId ?? image.project.originalImage.publicId,
      {
        secure: true,
        transformation: [
          ...legacyBackgroundTransformation,
          ...(dimensions
            ? [{
                width: dimensions.width,
                height: dimensions.height,
                crop: "fill" as const,
                gravity: "auto" as const,
              }]
            : []),
          { quality: "auto", fetch_format: "auto", flags: "attachment" },
        ],
      },
    );

    return NextResponse.redirect(downloadUrl, { status: 302 });
  } catch (error) {
    console.error(
      "[GET /api/images/[imageId]/download] Could not create download URL:",
      error instanceof Error ? error.message : "Unknown download error",
    );
    return NextResponse.json(
      { error: "This image could not be prepared for download." },
      { status: 502 },
    );
  }
}
