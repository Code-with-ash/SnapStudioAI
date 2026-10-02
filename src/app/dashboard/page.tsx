import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentAppUser();

  const [projects, totalProjects, completedProjects, generatedImages] =
    await Promise.all([
      prisma.project.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 8,
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
      }),
      prisma.project.count({ where: { userId: user.id } }),
      prisma.project.count({
        where: { userId: user.id, status: "COMPLETED" },
      }),
      prisma.generatedImage.count({ where: { project: { userId: user.id } } }),
    ]);

  return (
    <DashboardClient
      user={{
        name: user.name,
        email: user.email,
        credits: user.credits,
      }}
      stats={{ totalProjects, completedProjects, generatedImages }}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        updatedAt: project.updatedAt.toISOString(),
        coverImage:
          project.generatedImages[0]?.secureUrl ??
          project.originalImage?.secureUrl ??
          null,
        imageCount: project._count.generatedImages,
      }))}
    />
  );
}
