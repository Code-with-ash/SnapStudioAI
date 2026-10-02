"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Aperture,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  Image as ImageIcon,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";
import type { ProjectStatus, Scene } from "@/generated/prisma/client";
import { GalleryGrid, type GalleryImage } from "@/components/gallery/gallery-grid";
import { ImageComparison } from "@/components/gallery/image-comparison";

type ProjectSnapshot = {
  id: string;
  name: string;
  status: ProjectStatus;
  errorMessage: string | null;
  originalImage: { secureUrl: string } | null;
  generatedImages: GalleryImage[];
};

type ProjectStudioProps = {
  initialProject: ProjectSnapshot;
  initialCredits: number;
};

const scenes: Scene[] = ["STUDIO", "STREETWEAR", "LUXURY", "MINIMAL"];
const allScenes: Scene[] = [
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
];
const sceneNames: Record<Scene, string> = {
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

type ModelGender = "female" | "male";

const steps = [
  { title: "Uploading", detail: "Product photo securely stored" },
  { title: "Analyzing product", detail: "Reading the image with Cloudinary AI" },
  { title: "Detecting details", detail: "Identifying product type and visual attributes" },
  { title: "Building the scene", detail: "Writing a product-aware direction" },
  { title: "Creating photoshoot", detail: "Styling your product on an AI fashion model" },
  { title: "Preparing variations", detail: "Creating a model-worn look for each scene" },
  { title: "Optimizing images", detail: "Delivering fast, format-aware images" },
  { title: "Finished", detail: "Your images are ready" },
];

async function readError(response: Response, fallback: string) {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error ?? fallback;
}

type ScenePickerProps = {
  selectedScenes: Scene[];
  modelGender: ModelGender;
  isFirstRun?: boolean;
  creditsAvailable: number;
  isSubmitting: boolean;
  onToggle: (scene: Scene) => void;
  onGenderChange: (gender: ModelGender) => void;
  onGenerate: () => void;
};

function ScenePicker({
  selectedScenes,
  modelGender,
  isFirstRun = false,
  creditsAvailable,
  isSubmitting,
  onToggle,
  onGenderChange,
  onGenerate,
}: ScenePickerProps) {
  return (
    <div className="scene-picker">
      <div className="model-picker">
        <div className="model-picker-heading">
          <div><strong>Choose your model</strong><span>Set the look for this photoshoot.</span></div>
        </div>
        <div className="model-gender-options" role="group" aria-label="Fashion model gender">
          {(["female", "male"] as const).map((gender) => (
            <button
              className={`model-gender-option${modelGender === gender ? " is-selected" : ""}`}
              type="button"
              key={gender}
              aria-pressed={modelGender === gender}
              onClick={() => onGenderChange(gender)}
            >
              <span className="model-gender-icon"><UserRound size={17} /></span>
              <span>{gender === "female" ? "Female model" : "Male model"}</span>
              {modelGender === gender && <Check className="model-gender-check" size={14} />}
            </button>
          ))}
        </div>
      </div>
      <div className="scene-picker-heading">
        <div><strong>Choose your scenes</strong><span>One credit creates one scene variation.</span></div>
        <span>{creditsAvailable} credits available</span>
      </div>
      <div className="scene-picker-options">
        {allScenes.map((scene) => (
          <button
            className={`scene-picker-option${selectedScenes.includes(scene) ? " is-selected" : ""}`}
            type="button"
            key={scene}
            aria-pressed={selectedScenes.includes(scene)}
            onClick={() => onToggle(scene)}
          >
            {selectedScenes.includes(scene) && <Check size={12} />}
            {sceneNames[scene]}
          </button>
        ))}
      </div>
      <div className="scene-picker-footer">
        <span>{selectedScenes.length} {selectedScenes.length === 1 ? "variation" : "variations"} selected</span>
        <button
          className="button button-primary"
          type="button"
          disabled={isSubmitting || selectedScenes.length === 0 || selectedScenes.length > creditsAvailable}
          onClick={onGenerate}
        >
          {isSubmitting ? <LoaderCircle className="upload-spinner" size={14} /> : <WandSparkles size={14} />}
          {isFirstRun ? "Create photoshoot" : `Create ${selectedScenes.length} ${selectedScenes.length === 1 ? "variation" : "variations"}`}
          <ArrowRight size={14} />
        </button>
      </div>
      {selectedScenes.length > creditsAvailable && (
        <p className="scene-picker-warning" role="alert">Select no more than {creditsAvailable} scenes to continue.</p>
      )}
    </div>
  );
}

function getStepIndex(status: ProjectStatus) {
  if (status === "DRAFT" || status === "UPLOADING") return 1;
  if (status === "ANALYZING") return 1;
  if (status === "GENERATING") return 4;
  if (status === "COMPLETED") return 7;
  return -1;
}

export function ProjectStudio({ initialProject, initialCredits }: ProjectStudioProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [creditsAvailable, setCreditsAvailable] = useState(initialCredits);
  const [selectedScenes, setSelectedScenes] = useState<Scene[]>(scenes);
  const [modelGender, setModelGender] = useState<ModelGender>("female");
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const processing = project.status === "ANALYZING" || project.status === "GENERATING";

  const refreshProject = useCallback(async () => {
    const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(await readError(response, "Could not refresh this project."));
    }
    const result = await response.json() as ProjectSnapshot;
    setProject(result);
    return result;
  }, [project.id]);

  const generate = useCallback(async () => {
    setActionError(null);
    setIsSubmitting(true);
    setProject((current) => ({ ...current, status: "ANALYZING", errorMessage: null }));

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          scenes: selectedScenes,
          modelGender,
        }),
      });
      if (!response.ok) {
        const message = await readError(response, "Photoshoot generation failed.");
        setActionError(message);
        const latest = await refreshProject();
        if (latest.status === "DRAFT") {
          setProject({ ...latest, status: "FAILED", errorMessage: message });
        }
        return;
      }
      const result = await response.json() as { creditsRemaining?: number };
      if (typeof result.creditsRemaining === "number") {
        setCreditsAvailable(result.creditsRemaining);
      }
      await refreshProject();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reach the generation service.";
      setActionError(message);
      try {
        const latest = await refreshProject();
        if (latest.status === "DRAFT") {
          setProject({ ...latest, status: "FAILED", errorMessage: message });
        }
      } catch {
        setProject((current) => ({ ...current, status: "FAILED", errorMessage: message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [modelGender, project.id, refreshProject, router, selectedScenes]);

  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => {
      void refreshProject().catch((error: unknown) => {
        setActionError(error instanceof Error ? error.message : "Could not update generation status.");
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, [processing, refreshProject]);

  const handleRetry = () => {
    setShowScenePicker(false);
    void generate();
  };

  function toggleScene(scene: Scene) {
    setSelectedScenes((current) => current.includes(scene)
      ? current.filter((selected) => selected !== scene)
      : current.length < 6 ? [...current, scene] : current,
    );
  }

  async function deleteProject() {
    if (!window.confirm("Delete this project and its original upload? This cannot be undone.")) return;
    setActionError(null);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response, "Could not delete project."));
      const result = await response.json() as { cleanupWarning?: string | null };
      if (result.cleanupWarning) window.alert(result.cleanupWarning);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete project.");
    }
  }

  const activeStep = getStepIndex(project.status);

  return (
    <main className="project-studio">
      <header className="project-studio-header">
        <Link className="workspace-brand" href="/dashboard" aria-label="Back to dashboard">
          <span className="workspace-brand-mark"><Aperture size={17} /></span>
          <span>snapstudio<span>.ai</span></span>
        </Link>
        <div className="project-studio-breadcrumb">
          <Link href="/dashboard">Workspace</Link><span>/</span><strong>{project.name}</strong>
        </div>
        <UserButton />
      </header>

      <div className="project-studio-content">
        {processing || project.status === "DRAFT" || (project.status === "FAILED" && !project.generatedImages.length) ? (
          <section className="processing-view">
            <div className="processing-copy">
              <span className="eyebrow"><Sparkles size={13} /> {project.status === "DRAFT" ? "MAKE IT YOURS" : "THE STUDIO IS AT WORK"}</span>
              <h1>{project.status === "FAILED" ? <>Let’s get that<br /><span>back on track.</span></> : project.status === "DRAFT" ? <>Set the scene.<br /><span>Meet the model.</span></> : <>Turning your product<br />into <span>a story.</span></>}</h1>
              <p>{project.status === "FAILED" ? "Something interrupted this photoshoot. Your product photo is safe—adjust your choices and try again." : project.status === "DRAFT" ? "Choose who wears your product, then pick the campaign scenes. We’ll take it from there." : "Cloudinary is analyzing your product and creating campaign images that show it worn by a fashion model."}</p>
              <div className="processing-scene-tags">
                {scenes.map((scene) => <span key={scene}>{sceneNames[scene]}</span>)}
              </div>
            </div>

            <motion.div
              className="processing-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              <div className="processing-panel-heading">
                <span className="processing-pulse"><Sparkles size={16} /></span>
                <div><strong>{project.status === "FAILED" ? "Photoshoot paused" : "Your photoshoot"}</strong><small>{project.name}</small></div>
                {processing && <span className="processing-live"><span /> LIVE</span>}
              </div>
              {project.originalImage && (
                <div className="processing-source">
                  <Image src={project.originalImage.secureUrl} alt="Uploaded product" width={57} height={70} unoptimized />
                  <span>YOUR PRODUCT</span>
                  <Check size={14} />
                </div>
              )}
              {project.status !== "DRAFT" && <div className="processing-steps" aria-live="polite">
                {steps.map((step, index) => {
                  const complete = project.status === "COMPLETED" || index < activeStep;
                  const active = !complete && index === activeStep && project.status !== "FAILED";
                  return (
                    <div className={`processing-step${complete ? " is-complete" : ""}${active ? " is-active" : ""}`} key={step.title}>
                      <span className="processing-step-marker">
                        {complete ? <Check size={12} /> : active ? <LoaderCircle className="upload-spinner" size={12} /> : <span>{String(index + 1).padStart(2, "0")}</span>}
                      </span>
                      <span className="processing-step-copy"><strong>{step.title}</strong><small>{step.detail}</small></span>
                      {complete && <span className="processing-step-done">DONE</span>}
                    </div>
                  );
                })}
              </div>}
              {project.status === "FAILED" && (
                <div className="processing-error" role="alert">
                  <CircleAlert size={15} /> {actionError ?? project.errorMessage ?? "Generation failed."}
                </div>
              )}
              {actionError && project.status !== "FAILED" && (
                <div className="processing-error" role="alert"><CircleAlert size={15} /> {actionError}</div>
              )}
              {(project.status === "DRAFT" || project.status === "FAILED") && (
                <ScenePicker
                  selectedScenes={selectedScenes}
                  modelGender={modelGender}
                  isFirstRun={project.status === "DRAFT"}
                  creditsAvailable={creditsAvailable}
                  isSubmitting={isSubmitting}
                  onToggle={toggleScene}
                  onGenderChange={setModelGender}
                  onGenerate={handleRetry}
                />
              )}
              {processing && (
                <div className="processing-footnote"><Clock3 size={12} /> This usually takes less than a minute.</div>
              )}
            </motion.div>
          </section>
        ) : (
          <section className="project-gallery-view">
            <div className="project-gallery-top">
              <div>
                <Link href="/dashboard" className="project-back-link"><ArrowLeft size={13} /> All projects</Link>
                <span className="eyebrow"><span className="status-dot" /> PHOTOSHOOT COMPLETE</span>
                <h1>{project.name}<span>.</span></h1>
                <p>{project.generatedImages.length} campaign images, generated with Cloudinary AI.</p>
              </div>
              <div className="project-gallery-actions">
                <button className="button button-dark-outline" type="button" onClick={() => void deleteProject()}>
                  Delete project
                </button>
                <button className="button button-primary" type="button" onClick={() => setShowScenePicker((current) => !current)} disabled={isSubmitting}>
                  {isSubmitting ? <LoaderCircle className="upload-spinner" size={14} /> : <RotateCcw size={14} />}
                  {showScenePicker ? "Close options" : "Generate more"}
                </button>
              </div>
            </div>
            {project.status === "FAILED" && project.errorMessage && (
              <div className="gallery-error" role="alert">{project.errorMessage}</div>
            )}
            {actionError && <div className="gallery-error" role="alert">{actionError}</div>}
            {showScenePicker && (
              <ScenePicker
                selectedScenes={selectedScenes}
                modelGender={modelGender}
                creditsAvailable={creditsAvailable}
                isSubmitting={isSubmitting}
                onToggle={toggleScene}
                onGenderChange={setModelGender}
                onGenerate={handleRetry}
              />
            )}
            <div className="project-detections">
              {[
                ["Product", project.generatedImages[0]?.prompt.match(/actually wearing the (.+?);/)?.[1] ?? "Analyzed"],
                ["Model", project.generatedImages[0]?.prompt.match(/adult (female|male) fashion model/i)?.[1]?.replace(/^./, (letter) => letter.toUpperCase()) ?? "—"],
                ["Scenes", [...new Set(project.generatedImages.map((image) => sceneNames[image.scene]))].join(", ") || "—"],
              ].map(([label, value]) => <div className="detection-chip" key={label}><small>{label}</small><span>{value}</span></div>)}
            </div>
            {project.generatedImages.length ? (
              <>
                <div className="project-output-heading">
                  <div>
                    <span className="eyebrow"><span className="status-dot" /> YOUR PHOTOSHOOT OUTPUT</span>
                    <h2>Campaign images</h2>
                  </div>
                  <span>{project.generatedImages.length} scenes</span>
                </div>
                <GalleryGrid
                  key={project.generatedImages.map((image) => image.id).join(":")}
                  images={project.generatedImages}
                  showProject={false}
                  variant="campaign"
                  emptyTitle="No generated images remain."
                  emptyMessage="Generate another set of scenes to fill this project gallery."
                />
              </>
            ) : (
              <div className="project-gallery-empty"><ImageIcon size={22} /><p>No generated images yet.</p></div>
            )}
            {project.originalImage && project.generatedImages[0] && (
              <ImageComparison
                originalUrl={project.originalImage.secureUrl}
                generatedUrl={project.generatedImages[0].secureUrl}
                generatedLabel={sceneNames[project.generatedImages[0].scene]}
              />
            )}
          </section>
        )}

        <footer className="project-studio-footer">
          <span>SNAPSTUDIO AI · GOOD IMAGES, GOOD THINGS</span>
          {processing && <span>PROJECT SAVED · GENERATION RUNNING</span>}
          {!processing && <span>PRIVATE WORKSPACE</span>}
        </footer>
      </div>
    </main>
  );
}
