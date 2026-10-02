import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { prisma } from "@/lib/db";
import type { ImagePreset, Scene } from "@/generated/prisma/client";
import { IMAGE_PRESETS } from "@/lib/cloudinary/presets";

export const runtime = "nodejs";
export const maxDuration = 120;

const SCENE_PROMPTS: Record<Scene, string> = {
  STUDIO: "a refined seamless studio backdrop with soft directional editorial lighting",
  STREETWEAR: "an understated urban streetwear setting with textured concrete and natural city light",
  LUXURY: "a warm luxury atelier with elegant architectural details and subtle golden light",
  MINIMAL: "a minimal warm ivory set with sculptural shadows and a clean premium finish",
  CAFE: "a stylish neighborhood cafe with soft window light and a relaxed editorial mood",
  BEACH: "a quiet coastal setting with pale sand, a muted sea horizon, and gentle daylight",
  WINTER: "a crisp winter setting with softly falling snow and cool, diffused light",
  GYM: "a contemporary fitness studio with clean lines and directional daylight",
  NIGHT_CITY: "a cinematic city street at night with tasteful reflections and soft ambient lights",
  FESTIVAL: "a sunlit outdoor festival scene with tasteful color and a candid editorial atmosphere",
};

const sceneSchema = z.enum([
  "STUDIO",
  "STREETWEAR",
  "LUXURY",
  "MINIMAL",
  "CAFE",
  "BEACH",
  "WINTER",
  "GYM",
  "NIGHT_CITY",
  "FESTIVAL",
]);

const requestSchema = z.object({
  projectId: z.string().min(1).max(64),
  modelGender: z.enum(["female", "male"]),
  scenes: z
    .array(sceneSchema)
    .min(1)
    .max(6)
    .refine((scenes) => new Set(scenes).size === scenes.length, {
      message: "Scene selections must be unique.",
    })
    .optional(),
});

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectAnalysisText(value: unknown, depth = 0): string[] {
  if (depth > 8) return [];
  if (typeof value === "string") {
    const text = value.trim();
    return text.length >= 3 && !["complete", "success", "ok"].includes(text.toLowerCase())
      ? [text]
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectAnalysisText(entry, depth + 1));
  }
  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, child]) => {
    if (/^(status|request_id|entity)$/i.test(key)) return [];
    return collectAnalysisText(child, depth + 1);
  });
}

function findAnalysisValue(value: unknown, keyMatcher: RegExp, depth = 0): string | null {
  if (depth > 8 || !isRecord(value)) return null;

  for (const [key, child] of Object.entries(value)) {
    if (keyMatcher.test(key)) {
      if (typeof child === "string" && child.trim()) return child.trim();
      if (Array.isArray(child)) {
        const strings = child.filter((entry): entry is string => typeof entry === "string");
        if (strings.length) return strings.join(", ");
      }
    }

    const nested = findAnalysisValue(child, keyMatcher, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function findTerm(text: string, terms: readonly string[]): string | null {
  const normalizedText = text.toLowerCase();
  return terms.find((term) =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(normalizedText),
  ) ?? null;
}

function inferProductDetails(
  fashionAnalysis: unknown,
  captionAnalysis: unknown,
): {
  category: string | null;
  color: string | null;
  material: string | null;
  style: string | null;
  product: string | null;
  summary: string;
} {
  const analysisText = [
    ...collectAnalysisText(fashionAnalysis),
    ...collectAnalysisText(captionAnalysis),
  ].join(" ").replace(/\s+/g, " ").slice(0, 800);

  const category =
    findAnalysisValue(fashionAnalysis, /category|product_type|type/i) ??
    findTerm(analysisText, [
      "hoodie", "sweatshirt", "t-shirt", "shirt", "blouse", "jacket", "coat",
      "dress", "skirt", "trousers", "pants", "jeans", "shorts", "sweater",
      "cardigan", "suit", "top", "leggings", "sneakers", "shoes", "bag",
    ]);
  const color =
    findAnalysisValue(fashionAnalysis, /colou?r/i) ??
    findTerm(analysisText, [
      "black", "white", "ivory", "cream", "beige", "brown", "red", "orange",
      "yellow", "green", "blue", "navy", "purple", "pink", "gray", "grey",
    ]);
  const material =
    findAnalysisValue(fashionAnalysis, /material|fabric|textile/i) ??
    findTerm(analysisText, [
      "cotton", "denim", "linen", "silk", "wool", "leather", "suede",
      "polyester", "knit", "cashmere", "satin", "velvet",
    ]);
  const style =
    findAnalysisValue(fashionAnalysis, /style|aesthetic/i) ??
    findTerm(analysisText, [
      "streetwear", "casual", "formal", "sporty", "minimal", "vintage",
      "bohemian", "luxury", "classic", "athletic",
    ]);

  return {
    category,
    color,
    material,
    style,
    product: findAnalysisValue(captionAnalysis, /caption|description|summary/i),
    summary: analysisText,
  };
}

function makePrompt(
  details: ReturnType<typeof inferProductDetails>,
  scene: Scene,
  modelGender: "female" | "male",
): string {
  const attributes = [
    details.color,
    details.material,
    details.category,
  ].filter(Boolean).join(" ");
  const product = attributes || details.category || "the uploaded fashion garment";

  return [
    `Create a photorealistic fashion campaign photograph using reference image [1] as the exact product reference.`,
    `Show an adult ${modelGender} fashion model actually wearing the ${product}; do not show it as a flat lay, mannequin, or isolated product.`,
    `Keep the garment's recognizable color, cut, silhouette, fabric, pattern, branding, and construction faithful to reference image [1].`,
    `Style the photoshoot in ${SCENE_PROMPTS[scene]}.`,
    "Make the garment clearly visible and the main subject, with a natural pose, realistic fit and folds, professional editorial lighting, and a polished e-commerce-ready composition.",
    "Do not add text, watermarks, extra garments, or accessories that obscure the product.",
  ].join(" ");
}

function makeImagePresetRecords(
  publicId: string,
  generatedImageId: string,
) {
  const cloudinary = getCloudinaryClient();
  return (Object.entries(IMAGE_PRESETS) as [
    ImagePreset,
    (typeof IMAGE_PRESETS)[ImagePreset],
  ][]).map(([preset, dimensions]) => ({
    preset,
    secureUrl: cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: dimensions.width,
          height: dimensions.height,
          crop: "fill",
          gravity: "auto",
        },
        { quality: "auto", fetch_format: "auto" },
      ],
    }),
    width: dimensions.width,
    height: dimensions.height,
    generatedImageId,
  }));
}

class CloudinaryImageGenerationError extends Error {
  constructor(
    message: string,
    readonly httpCode: number | null,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "CloudinaryImageGenerationError";
  }
}

async function generateImageFromReference(
  referenceUrl: string,
  prompt: string,
): Promise<{ publicId: string; secureUrl: string }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary Image Generation requires server-side Cloudinary credentials.");
  }

  const response = await fetch(
    `https://api.cloudinary.com/v2/generate/${encodeURIComponent(cloudName)}/image_to_image`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        reference_images: [{ source_type: "url", url: referenceUrl }],
        model: { mode: "auto", preference: "quality" },
        format: "jpeg",
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const responseRecord = isRecord(payload) ? payload : null;
    const errorRecord =
      responseRecord && isRecord(responseRecord.error) ? responseRecord.error : responseRecord;
    const message =
      (errorRecord && typeof errorRecord.message === "string" && errorRecord.message) ||
      `Cloudinary Image Generation returned HTTP ${response.status}.`;
    const requestId =
      responseRecord && typeof responseRecord.request_id === "string"
        ? responseRecord.request_id
        : null;
    throw new CloudinaryImageGenerationError(message, response.status, requestId);
  }

  const responseRecord = isRecord(payload) ? payload : null;
  const data = responseRecord && isRecord(responseRecord.data) ? responseRecord.data : null;
  const assets = data && Array.isArray(data.assets) ? data.assets : [];
  const firstAsset = assets[0];
  const storage =
    isRecord(firstAsset) && isRecord(firstAsset.storage) ? firstAsset.storage : null;
  const publicId = storage && typeof storage.public_id === "string" ? storage.public_id : null;
  const secureUrl = storage && typeof storage.secure_url === "string" ? storage.secure_url : null;
  if (!publicId || !secureUrl) {
    throw new Error("Cloudinary Image Generation did not return a saved image asset.");
  }

  return { publicId, secureUrl };
}

function getCloudinaryError(error: unknown): {
  message: string;
  httpCode: number | null;
  requestId: string | null;
} {
  if (error instanceof CloudinaryImageGenerationError) {
    return {
      message: error.message,
      httpCode: error.httpCode,
      requestId: error.requestId,
    };
  }
  const outer = isRecord(error) ? error : null;
  const nested = outer && isRecord(outer.error) ? outer.error : outer;
  const message =
    (nested && typeof nested.message === "string" && nested.message) ||
    (error instanceof Error && error.message) ||
    "Unknown service error";
  const rawCode = nested?.http_code ?? nested?.statusCode ?? nested?.status;
  const rawRequestId = nested?.request_id;

  return {
    message,
    httpCode: typeof rawCode === "number" ? rawCode : null,
    requestId: typeof rawRequestId === "string" ? rawRequestId : null,
  };
}

function getErrorMessage(error: unknown) {
  return getCloudinaryError(error).message;
}

function getCloudinaryHttpCode(error: unknown): number | null {
  return getCloudinaryError(error).httpCode;
}

function getFailureMessage(stage: string, error: unknown): string {
  const cloudinaryError = getCloudinaryError(error);
  const detail = cloudinaryError.message.slice(0, 220);
  const status = cloudinaryError.httpCode ? ` (HTTP ${cloudinaryError.httpCode})` : "";

  if (stage === "fashion analysis") {
    return `Cloudinary Fashion analysis failed${status}. Check that the Cloudinary AI Content Analysis add-on is enabled for this cloud. ${detail}`;
  }

  if (stage === "caption analysis") {
    return `Cloudinary Captioning analysis failed${status}. Check that the Cloudinary AI Content Analysis add-on is enabled for this cloud. ${detail}`;
  }

  if (stage === "generation") {
    return `Cloudinary could not generate the model-wearing-product images${status}. Check that the Cloudinary Image Generation add-on is enabled for this cloud. ${detail}`;
  }

  if (stage === "saving") {
    return `The images were generated, but could not be saved to the project. ${detail}`;
  }

  return `Photoshoot generation failed while ${stage}${status}. ${detail}`;
}

export async function POST(request: Request) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Sign in to generate a photoshoot." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a project ID and between one and six valid scene selections." },
      { status: 400 },
    );
  }

  let user;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    console.error("[POST /api/generate] Failed to load application user:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Your account could not be loaded. Please try again." },
      { status: 500 },
    );
  }

  let project;
  try {
    project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId: user.id },
      include: {
        originalImage: true,
        generatedImages: { select: { scene: true, variation: true } },
      },
    });
  } catch (error) {
    console.error("[POST /api/generate] Failed to load project:", getErrorMessage(error));
    return NextResponse.json(
      { error: "The project could not be loaded. Please try again." },
      { status: 500 },
    );
  }

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (!project.originalImage) {
    return NextResponse.json({ error: "Upload a product image before generating." }, { status: 400 });
  }
  const originalImage = project.originalImage;

  if (["UPLOADING", "ANALYZING", "GENERATING"].includes(project.status)) {
    return NextResponse.json(
      { error: "This project is already being processed." },
      { status: 409 },
    );
  }

  const scenes = parsed.data.scenes ?? ["STUDIO", "STREETWEAR", "LUXURY", "MINIMAL"];
  if (user.credits < scenes.length) {
    return NextResponse.json(
      { error: `You need ${scenes.length} credits to generate these variations.` },
      { status: 402 },
    );
  }

  let claim;
  try {
    claim = await prisma.project.updateMany({
      where: {
        id: project.id,
        userId: user.id,
        status: { in: ["DRAFT", "COMPLETED", "FAILED"] },
      },
      data: { status: "ANALYZING", errorMessage: null },
    });
  } catch (error) {
    console.error("[POST /api/generate] Failed to claim project:", getErrorMessage(error));
    return NextResponse.json(
      { error: "The project could not start processing. Please try again." },
      { status: 500 },
    );
  }

  if (claim.count !== 1) {
    return NextResponse.json(
      { error: "This project is already being processed. Refresh and try again." },
      { status: 409 },
    );
  }

  let reservedCredits = false;
  let generatedPublicIds: string[] = [];
  let stage = "starting";
  try {
    const cloudinary = getCloudinaryClient();
    stage = "fashion analysis";
    const fashionAnalysis = await cloudinary.analysis.analyze_uri(
      originalImage.secureUrl,
      "cld_fashion",
    );
    stage = "caption analysis";
    const captionAnalysis = await cloudinary.analysis.analyze_uri(
      originalImage.secureUrl,
      "captioning",
    );

    stage = "building prompts";
    const details = inferProductDetails(fashionAnalysis, captionAnalysis);
    const prompts = scenes.map((scene) => {
      const previousVariations = project.generatedImages
        .filter((image) => image.scene === scene)
        .map((image) => image.variation);

      return {
        scene,
        variation: Math.max(0, ...previousVariations) + 1,
        prompt: makePrompt(details, scene, parsed.data.modelGender),
      };
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "GENERATING",
        detectedCategory: details.category,
        detectedColor: details.color,
        detectedMaterial: details.material,
        detectedStyle: details.style,
        detectedProduct: details.product,
        prompt: prompts[0]?.prompt,
        errorMessage: null,
      },
    });

    const creditReservation = await prisma.user.updateMany({
      where: { id: user.id, credits: { gte: prompts.length } },
      data: { credits: { decrement: prompts.length } },
    });

    if (creditReservation.count !== 1) {
      await prisma.project.update({
        where: { id: project.id },
        data: { status: project.status, errorMessage: null },
      });
      return NextResponse.json(
        { error: `You need ${prompts.length} credits to generate these variations.` },
        { status: 402 },
      );
    }
    reservedCredits = true;
    stage = "generation";
    stage = "generation";
    const generationResults = await Promise.allSettled(
      prompts.map(async (entry) => ({
        entry,
        asset: await generateImageFromReference(originalImage.secureUrl, entry.prompt),
      })),
    );
    const generatedImages = generationResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const generationFailure = generationResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (generationFailure) {
      const cleanupResults = await Promise.allSettled(
        generatedImages.map(({ asset }) =>
          cloudinary.uploader.destroy(asset.publicId, { resource_type: "image", invalidate: true }),
        ),
      );
      cleanupResults.forEach((result) => {
        if (result.status === "rejected") {
          console.error(
            "[POST /api/generate] Failed to remove a partial generated asset:",
            getErrorMessage(result.reason),
          );
        }
      });
      throw generationFailure.reason;
    }
    generatedPublicIds = generatedImages.map(({ asset }) => asset.publicId);

    stage = "saving";
    const updatedUser = await prisma.$transaction(async (transaction) => {
      for (const { entry, asset } of generatedImages) {
        const createdImage = await transaction.generatedImage.create({
          data: {
            projectId: project.id,
            publicId: asset.publicId,
            secureUrl: asset.secureUrl,
            scene: entry.scene,
            variation: entry.variation,
            prompt: entry.prompt,
          },
          select: { id: true },
        });

        await transaction.imageTransformation.createMany({
          data: makeImagePresetRecords(
            asset.publicId,
            createdImage.id,
          ),
        });
      }

      await transaction.project.update({
        where: { id: project.id },
        data: { status: "COMPLETED", errorMessage: null },
      });
      return transaction.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { credits: true },
      });
    }, {
      maxWait: 15_000,
      timeout: 30_000,
    });
    generatedPublicIds = [];
    reservedCredits = false;

    return NextResponse.json({
      projectId: project.id,
      status: "COMPLETED",
      generatedCount: generatedImages.length,
      creditsRemaining: updatedUser.credits,
    });
  } catch (error) {
    const message = getFailureMessage(stage, error);
    const upstreamStatus = getCloudinaryHttpCode(error);
    const responseStatus = stage === "saving" ? 500 : 502;
    const cloudinaryError = getCloudinaryError(error);

    console.error(
      "[POST /api/generate] Generation failed:",
      `stage=${stage}`,
      upstreamStatus ? `upstream_status=${upstreamStatus}` : "",
      cloudinaryError.requestId ? `request_id=${cloudinaryError.requestId}` : "",
      cloudinaryError.message,
    );

    if (reservedCredits) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: scenes.length } },
        });
      } catch (refundError) {
        console.error(
          "[POST /api/generate] Failed to restore reserved credits:",
          getErrorMessage(refundError),
        );
      }
    }

    if (stage === "saving" && generatedPublicIds.length) {
      const cleanupResults = await Promise.allSettled(
        generatedPublicIds.map((publicId) =>
          getCloudinaryClient().uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
          }),
        ),
      );
      cleanupResults.forEach((result) => {
        if (result.status === "rejected") {
          console.error(
            "[POST /api/generate] Failed to remove an unsaved generated asset:",
            getErrorMessage(result.reason),
          );
        }
      });
    }

    try {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: "FAILED",
          errorMessage: message,
        },
      });
    } catch (statusError) {
      console.error(
        "[POST /api/generate] Failed to update project status:",
        getErrorMessage(statusError),
      );
    }

    return NextResponse.json(
      { error: message, stage, upstreamStatus, requestId: cloudinaryError.requestId },
      { status: responseStatus },
    );
  }
}
