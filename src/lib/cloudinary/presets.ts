import type { ImagePreset } from "@/generated/prisma/client";

export const IMAGE_PRESETS: Record<ImagePreset, { label: string; width: number; height: number }> = {
  INSTAGRAM_POST: { label: "Instagram Post", width: 1080, height: 1080 },
  INSTAGRAM_STORY: { label: "Instagram Story", width: 1080, height: 1920 },
  WEBSITE_HERO: { label: "Website Hero", width: 1920, height: 1080 },
  AMAZON: { label: "Amazon", width: 1600, height: 1600 },
  SHOPIFY: { label: "Shopify", width: 2048, height: 2048 },
};

export function getBackgroundPrompt(prompt: string): string {
  const match = prompt.match(/Replace only the background with (.+?)\. Preserve the original product/);
  if (!match?.[1]) {
    throw new Error("The saved prompt does not contain a Cloudinary background scene.");
  }
  return match[1];
}
