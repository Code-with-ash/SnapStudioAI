import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to search your projects." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80);
  if (!query) {
    return NextResponse.json({ error: "Enter a project name to search." }, { status: 400 });
  }

  const user = await getCurrentAppUser();
  const projects = await prisma.project.findMany({
    where: {
      userId: user.id,
      name: { contains: query, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      originalImage: { select: { secureUrl: true } },
      generatedImages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { secureUrl: true },
      },
      _count: { select: { generatedImages: true } },
    },
  });

  return NextResponse.json({
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      updatedAt: project.updatedAt.toISOString(),
      coverImage:
        project.generatedImages[0]?.secureUrl ??
        project.originalImage?.secureUrl ??
        null,
      imageCount: project._count.generatedImages,
    })),
  });
}
