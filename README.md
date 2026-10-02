# SnapStudio AI

SnapStudio AI turns a product photo into a set of polished fashion campaign images. Upload a garment photo, choose a model and campaign scenes, and generate editorial-style variations in a private workspace. Cloudinary analyzes the product, creates the images, and delivers optimized previews and downloads.

## Problem

Fashion brands and independent sellers need attractive, channel-ready product photography to market their products. Producing multiple campaign scenes with models can require a photoshoot, studio time, and image editing—resources that are costly or difficult to access.

## Solution

SnapStudio AI streamlines that workflow: it analyzes an uploaded garment photo, uses those details to guide reference-based image generation, and organizes the resulting campaign images in a private workspace. Users can generate different scenes and download versions sized for social media, storefronts, and product listings.

## Track

**Pixels to Products — AI-powered fashion and e-commerce imagery.** The project takes a product image (“pixels”) and turns it into campaign-ready product visuals.

## Technologies

- **Next.js 16, React 19, TypeScript** — full-stack web application.
- **Tailwind CSS 4** — styling.
- **Cloudinary** — image upload and storage, AI fashion and caption analysis, reference-guided image generation, CDN delivery, and image transformations.
- **Clerk** — authentication and private user workspaces.
- **PostgreSQL and Prisma** — users, projects, image metadata, and generation state.
- **Vercel** — deployment.

## Cloudinary integration

Cloudinary is used throughout the media workflow:

1. The server validates uploaded JPG, PNG, or WebP images (up to 10 MB) and uploads the original to Cloudinary.
2. Cloudinary's `cld_fashion` and `captioning` analysis add-ons identify garment attributes and describe the product.
3. The app combines those details with the selected model and scene to build a prompt. Cloudinary Image Generation uses the uploaded photo as a reference to create campaign imagery.
4. Generated assets are stored in Cloudinary and served from its CDN. Automatic format and quality transformations optimize delivery.
5. Download presets provide images sized for Instagram posts and stories, website hero banners, Amazon, and Shopify.

The app requires Cloudinary server-side credentials. The `cld_fashion` and `captioning` analysis add-ons and Cloudinary Image Generation must be enabled for the account; availability may depend on the Cloudinary plan.

## Setup

### Requirements

- Node.js 22.13 or newer and npm.
- A PostgreSQL database.
- A Clerk application.
- A Cloudinary account with the analysis add-ons and Image Generation enabled.

### Install and configure

1. Clone the repository and enter the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   Configure `DATABASE_URL` with the direct PostgreSQL connection string and, if available, `DATABASE_URL_POOLED` with the pooled connection string. Add the Clerk keys and the Cloudinary cloud name, API key, and API secret. Keep `.env` private; do not commit it or expose server secrets in client-side variables.

4. Apply the development database migration:

   ```bash
   npm run db:migrate -- --name init
   ```

5. Start the local development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000), create an account, and start a project.

## How to use

1. Sign in and create a photoshoot project.
2. Upload a clear product photo in JPG, PNG, or WebP format (maximum 10 MB).
3. Choose a model and the campaign scenes you want.
4. Generate the images. Cloudinary analyzes the uploaded product and uses it as a reference for the selected scenes.
5. Review the results in your workspace, then preview or download them using the available format presets.

Generated images are AI-created. Review garment details such as logos, patterns, and text before using an image as a definitive catalog representation.

## Deployment

The app can be deployed to Vercel as a Next.js project. Configure the same database, Clerk, and Cloudinary environment variables in the Vercel project settings. Apply database migrations from a trusted deployment environment with the production `DATABASE_URL` configured:

```bash
npm run db:deploy
```

Do not run development migrations against the production database. After deployment, verify sign-in, image upload, generation, downloads, and project persistence on the deployed domain.
