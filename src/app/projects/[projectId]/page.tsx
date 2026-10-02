import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { ProjectStudio } from "./project-studio";

export const metadata: Metadata = {
  title: "Photoshoot project",
};

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  const user = await getCurrentAppUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      originalImage: true,
      generatedImages: {
        orderBy: { createdAt: "desc" },
        include: { presets: true },
      },
    },
  });

  if (!project) notFound();

  return (
    <ProjectStudio
      initialCredits={user.credits}
      initialProject={{
        id: project.id,
        name: project.name,
        status: project.status,
        errorMessage: project.errorMessage,
        originalImage: project.originalImage
          ? { secureUrl: project.originalImage.secureUrl }
          : null,
        generatedImages: project.generatedImages.map((image) => ({
          id: image.id,
          secureUrl: image.secureUrl,
          scene: image.scene,
          variation: image.variation,
          prompt: image.prompt,
          isFavorite: image.isFavorite,
          createdAt: image.createdAt.toISOString(),
          project: { id: project.id, name: project.name },
          presets: image.presets.map((preset) => ({
            id: preset.id,
            preset: preset.preset,
            secureUrl: preset.secureUrl,
            width: preset.width,
            height: preset.height,
          })),
        })),
      }}
    />
  );
}
