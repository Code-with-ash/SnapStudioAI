import type { Metadata } from "next";
import Link from "next/link";
import { Aperture, Plus, Sparkles } from "lucide-react";
import { GalleryGrid, type GalleryImage } from "@/components/gallery/gallery-grid";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Gallery",
};

export default async function GalleryPage() {
  const user = await getCurrentAppUser();
  const images = await prisma.generatedImage.findMany({
    where: { project: { userId: user.id } },
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

  const galleryImages: GalleryImage[] = images.map((image) => ({
    ...image,
    createdAt: image.createdAt.toISOString(),
    presets: image.presets.map((preset) => ({
      id: preset.id,
      preset: preset.preset,
      secureUrl: preset.secureUrl,
      width: preset.width,
      height: preset.height,
    })),
  }));

  return (
    <main className="gallery-page">
      <aside className="gallery-sidebar">
        <Link className="workspace-brand" href="/dashboard">
          <span className="workspace-brand-mark"><Sparkles size={17} /></span>
          <span>snapstudio<span>.ai</span></span>
        </Link>
        <span className="workspace-nav-label">WORKSPACE</span>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <Link className="workspace-nav-item" href="/dashboard"><Aperture size={16} /> Overview</Link>
          <Link className="workspace-nav-item active" href="/gallery"><Sparkles size={16} /> Gallery</Link>
        </nav>
        <div className="gallery-sidebar-bottom">
          <span>YOUR GALLERY</span>
          <strong>{images.length}</strong>
          <small>generated images</small>
        </div>
      </aside>
      <section className="gallery-main">
        <header className="workspace-topbar">
          <div className="breadcrumbs"><Link href="/dashboard">Workspace</Link><span>/</span><strong>Gallery</strong></div>
          <Link href="/projects/new" className="button button-primary topbar-create"><Plus size={15} /> New photoshoot</Link>
        </header>
        <div className="gallery-page-content">
          <div className="gallery-page-heading">
            <div>
              <span className="eyebrow"><span className="status-dot" /> YOUR CAMPAIGN LIBRARY</span>
              <h1>Made to be <span>seen.</span></h1>
              <p>Every scene, every variation—together in one place.</p>
            </div>
            <span className="gallery-total">{images.length} IMAGES</span>
          </div>
          <GalleryGrid images={galleryImages} />
        </div>
      </section>
    </main>
  );
}
