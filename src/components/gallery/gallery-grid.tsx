"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Heart,
  Image as ImageIcon,
  LoaderCircle,
  Maximize2,
  Trash2,
} from "lucide-react";
import type { ImagePreset, Scene } from "@/generated/prisma/client";
import { IMAGE_PRESETS } from "@/lib/cloudinary/presets";

export type GalleryImage = {
  id: string;
  secureUrl: string;
  scene: Scene;
  variation: number;
  prompt: string;
  isFavorite: boolean;
  createdAt: string;
  project: { id: string; name: string };
  presets: Array<{
    id?: string;
    preset: ImagePreset;
    secureUrl: string;
    width: number;
    height: number;
  }>;
};

type GalleryGridProps = {
  images: GalleryImage[];
  showProject?: boolean;
  variant?: "default" | "campaign";
  emptyTitle?: string;
  emptyMessage?: string;
};

const sceneLabels: Record<Scene, string> = {
  STUDIO: "Studio",
  STREETWEAR: "Streetwear",
  LUXURY: "Luxury",
  MINIMAL: "Minimal",
  CAFE: "Cafe",
  BEACH: "Beach",
  WINTER: "Winter",
  GYM: "Gym",
  NIGHT_CITY: "Night city",
  FESTIVAL: "Festival",
};

async function readError(response: Response, fallback: string) {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error ?? fallback;
}

export function GalleryGrid({
  images: initialImages,
  showProject = true,
  variant = "default",
  emptyTitle = "Your gallery is waiting.",
  emptyMessage = "Create a photoshoot to see your first generated image here.",
}: GalleryGridProps) {
  const [images, setImages] = useState(initialImages);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Record<string, ImagePreset>>(() =>
    Object.fromEntries(initialImages.flatMap((image) => {
      const preset = image.presets.find((item) => item.preset === "INSTAGRAM_POST")?.preset
        ?? image.presets[0]?.preset;
      return preset ? [[image.id, preset]] : [];
    })),
  );
  const [busyImage, setBusyImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleImages = useMemo(
    () => favoritesOnly ? images.filter((image) => image.isFavorite) : images,
    [favoritesOnly, images],
  );

  async function toggleFavorite(image: GalleryImage) {
    setError(null);
    setBusyImage(image.id);
    try {
      const response = await fetch(`/api/images/${encodeURIComponent(image.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isFavorite: !image.isFavorite }),
      });
      if (!response.ok) throw new Error(await readError(response, "Could not update favorite."));
      setImages((current) => current.map((item) =>
        item.id === image.id ? { ...item, isFavorite: !item.isFavorite } : item,
      ));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update favorite.");
    } finally {
      setBusyImage(null);
    }
  }

  async function deleteImage(image: GalleryImage) {
    if (!window.confirm("Delete this generated image? This cannot be undone.")) return;
    setError(null);
    setBusyImage(image.id);
    try {
      const response = await fetch(`/api/images/${encodeURIComponent(image.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response, "Could not delete image."));
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete image.");
    } finally {
      setBusyImage(null);
    }
  }

  async function prepareFormats(image: GalleryImage) {
    setError(null);
    setBusyImage(image.id);
    try {
      const response = await fetch(
        `/api/images/${encodeURIComponent(image.id)}/transformations`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(await readError(response, "Could not prepare image formats."));
      const result = await response.json() as {
        transformations: GalleryImage["presets"];
      };
      setImages((current) => current.map((item) =>
        item.id === image.id ? { ...item, presets: result.transformations } : item,
      ));
      const defaultPreset = result.transformations.find(
        (preset) => preset.preset === "INSTAGRAM_POST",
      )?.preset ?? result.transformations[0]?.preset;
      if (defaultPreset) {
        setSelectedPreset((current) => ({ ...current, [image.id]: defaultPreset }));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare image formats.");
    } finally {
      setBusyImage(null);
    }
  }

  return (
    <div className="gallery-content">
      <div className="gallery-controls">
        <span className="gallery-count">{visibleImages.length} {visibleImages.length === 1 ? "image" : "images"}</span>
        <button
          type="button"
          className={`gallery-filter${favoritesOnly ? " is-selected" : ""}`}
          onClick={() => setFavoritesOnly((current) => !current)}
        >
          <Heart size={14} fill={favoritesOnly ? "currentColor" : "none"} />
          Favorites
        </button>
      </div>
      {error && <div className="gallery-error" role="alert">{error}</div>}

      {visibleImages.length === 0 ? (
        <div className="gallery-empty">
          <span className="gallery-empty-icon"><ImageIcon size={23} /></span>
          <h2>{favoritesOnly ? "No favorites yet." : emptyTitle}</h2>
          <p>{favoritesOnly ? "Favorite an image and it will be easy to find here." : emptyMessage}</p>
          {!favoritesOnly && (
            <Link className="button button-primary" href="/projects/new">Create a photoshoot</Link>
          )}
        </div>
      ) : (
        <div className={`gallery-grid${variant === "campaign" ? " gallery-grid-campaign" : ""}`}>
          {visibleImages.map((image) => {
            const activePreset = selectedPreset[image.id];
            const activeFormat = image.presets.find((preset) => preset.preset === activePreset);
            const busy = busyImage === image.id;
            const createdDate = new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
            }).format(new Date(image.createdAt));

            return (
              <article className="gallery-card" key={image.id}>
                <div className="gallery-image-wrap">
                  {failedImageIds.has(image.id) ? (
                    <div className="gallery-image-fallback" role="img" aria-label="Image preview could not be loaded">
                      <ImageIcon size={22} />
                      <span>Preview unavailable</span>
                      <a href={image.secureUrl} target="_blank" rel="noreferrer">Open image directly</a>
                    </div>
                  ) : (
                    <Image
                      className="gallery-image"
                      src={image.secureUrl}
                      alt={`${sceneLabels[image.scene]} fashion variation`}
                      width={800}
                      height={1000}
                      unoptimized
                      loading="eager"
                      onError={() => setFailedImageIds((current) => new Set(current).add(image.id))}
                      onLoad={() => setFailedImageIds((current) => {
                        if (!current.has(image.id)) return current;
                        const next = new Set(current);
                        next.delete(image.id);
                        return next;
                      })}
                    />
                  )}
                  <span className="gallery-scene">{sceneLabels[image.scene]} <span>·</span> V{image.variation}</span>
                  <div className="gallery-hover-actions">
                    <a className="gallery-icon-button" href={image.secureUrl} target="_blank" rel="noreferrer" aria-label="View full-size image">
                      <Maximize2 size={15} />
                    </a>
                    <button
                      className={`gallery-icon-button${image.isFavorite ? " is-favorite" : ""}`}
                      type="button"
                      aria-label={image.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      disabled={busy}
                      onClick={() => void toggleFavorite(image)}
                    >
                      <Heart size={15} fill={image.isFavorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
                <div className="gallery-card-body">
                  <div className="gallery-card-title">
                    <div>
                      <h3>{sceneLabels[image.scene]} scene</h3>
                      <span>{createdDate}{showProject ? ` · ${image.project.name}` : ""}</span>
                    </div>
                    {showProject && <Link href={`/projects/${image.project.id}`} className="gallery-project-link" aria-label={`Open ${image.project.name}`}><ArrowUpRight size={14} /></Link>}
                  </div>
                  <div className="gallery-card-actions">
                    {activeFormat ? (
                      <>
                        <select
                          className="format-select"
                          aria-label="Download image format"
                          value={activePreset}
                          onChange={(event) => setSelectedPreset((current) => ({
                            ...current,
                            [image.id]: event.target.value as ImagePreset,
                          }))}
                        >
                          {image.presets.map((preset) => (
                            <option value={preset.preset} key={preset.preset}>
                              {IMAGE_PRESETS[preset.preset].label} · {preset.width}×{preset.height}
                            </option>
                          ))}
                        </select>
                        <a
                          className="gallery-download"
                          href={`/api/images/${encodeURIComponent(image.id)}/download${activePreset ? `?preset=${activePreset}` : ""}`}
                          aria-label="Download selected image format"
                        >
                          <ArrowDownToLine size={15} />
                        </a>
                      </>
                    ) : (
                      <button
                        className="gallery-format-button"
                        type="button"
                        disabled={busy}
                        onClick={() => void prepareFormats(image)}
                      >
                        {busy ? <LoaderCircle className="upload-spinner" size={13} /> : <ImageIcon size={13} />}
                        Prepare formats
                      </button>
                    )}
                    <button
                      className="gallery-delete"
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteImage(image)}
                      aria-label="Delete generated image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {activeFormat && (
                    <a
                      className="gallery-original-download"
                      href={`/api/images/${encodeURIComponent(image.id)}/download`}
                    >
                      Download original variation
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
