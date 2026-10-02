-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'UPLOADING', 'ANALYZING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Scene" AS ENUM ('STUDIO', 'STREETWEAR', 'LUXURY', 'MINIMAL', 'CAFE', 'BEACH', 'WINTER', 'GYM', 'NIGHT_CITY', 'FESTIVAL');

-- CreateEnum
CREATE TYPE "ImagePreset" AS ENUM ('INSTAGRAM_POST', 'INSTAGRAM_STORY', 'WEBSITE_HERO', 'AMAZON', 'SHOPIFY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "detectedCategory" TEXT,
    "detectedColor" TEXT,
    "detectedMaterial" TEXT,
    "detectedStyle" TEXT,
    "detectedProduct" TEXT,
    "prompt" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OriginalImage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OriginalImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "publicId" TEXT,
    "secureUrl" TEXT NOT NULL,
    "scene" "Scene" NOT NULL,
    "variation" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageTransformation" (
    "id" TEXT NOT NULL,
    "generatedImageId" TEXT NOT NULL,
    "preset" "ImagePreset" NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageTransformation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Project_userId_status_idx" ON "Project"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OriginalImage_projectId_key" ON "OriginalImage"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "OriginalImage_publicId_key" ON "OriginalImage"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedImage_publicId_key" ON "GeneratedImage"("publicId");

-- CreateIndex
CREATE INDEX "GeneratedImage_projectId_createdAt_idx" ON "GeneratedImage"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedImage_isFavorite_createdAt_idx" ON "GeneratedImage"("isFavorite", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedImage_projectId_scene_variation_key" ON "GeneratedImage"("projectId", "scene", "variation");

-- CreateIndex
CREATE UNIQUE INDEX "ImageTransformation_generatedImageId_preset_key" ON "ImageTransformation"("generatedImageId", "preset");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OriginalImage" ADD CONSTRAINT "OriginalImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageTransformation" ADD CONSTRAINT "ImageTransformation_generatedImageId_fkey" FOREIGN KEY ("generatedImageId") REFERENCES "GeneratedImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
