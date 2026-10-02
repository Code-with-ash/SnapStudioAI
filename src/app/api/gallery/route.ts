import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to view your gallery." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().slice(0, 80);
  const favoritesOnly = searchParams.get("favorites") === "true";
  const user = await getCurrentAppUser();
  const images = await prisma.generatedImage.findMany({
    where: {
      project: {
        userId: user.id,
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      },
      ...(favoritesOnly ? { isFavorite: true } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      secureUrl: true,
      scene: true,
      variation: true,
      prompt: true,
      isFavorite: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
      presets: true,
    },
  });

  return NextResponse.json({
    images: images.map((image) => ({
      id: image.id,
      secureUrl: image.secureUrl,
      scene: image.scene,
      variation: image.variation,
      prompt: image.prompt,
      isFavorite: image.isFavorite,
      createdAt: image.createdAt,
      project: image.project,
      presets: image.presets,
    })),
  });
}
