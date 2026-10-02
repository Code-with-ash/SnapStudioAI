"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  FileImage,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type UploadResponse = {
  projectId?: string;
  error?: string;
};

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function acceptFile(candidate?: File) {
    setError(null);

    if (!candidate) return;

    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setFile(null);
      setPreviewUrl(null);
      setError("This file type isn’t supported. Choose a PNG, JPG, or WEBP image.");
      return;
    }

    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setPreviewUrl(null);
      setError("This image is larger than 10 MB. Choose a smaller file.");
      return;
    }

    if (candidate.size === 0) {
      setFile(null);
      setPreviewUrl(null);
      setError("This image is empty. Choose a different file.");
      return;
    }

    setFile(candidate);
    setPreviewUrl(URL.createObjectURL(candidate));
    setProgress(0);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  function onUpload() {
    if (!file) {
      setError("Choose an image to continue.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectName", file.name.replace(/\.[^.]+$/, "").trim() || "New photoshoot");

    const request = new XMLHttpRequest();
    request.open("POST", "/api/upload");
    request.responseType = "json";

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener("load", () => {
      const response = request.response as UploadResponse | null;
      if (request.status >= 200 && request.status < 300 && response?.projectId) {
        setProgress(100);
        router.push(`/projects/${encodeURIComponent(response.projectId)}`);
        return;
      }

      setIsUploading(false);
      setError(
        response?.error ??
          (request.status === 404
            ? "The upload service isn’t available yet. Please try again shortly."
            : "We couldn’t upload this image. Please try again."),
      );
    });

    request.addEventListener("error", () => {
      setIsUploading(false);
      setError("A network error interrupted the upload. Check your connection and try again.");
    });

    request.addEventListener("abort", () => {
      setIsUploading(false);
      setError("The upload was cancelled. You can try again when you’re ready.");
    });

    request.send(formData);
  }

  function clearFile() {
    if (isUploading) return;
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const fileSize = file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "";

  return (
    <div className="upload-form">
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Choose product photo"
        onChange={(event) => acceptFile(event.currentTarget.files?.[0])}
      />

      {file && previewUrl ? (
        <div className="upload-selected">
          <div
            className="upload-preview"
            role="img"
            aria-label={`Preview of ${file.name}`}
            style={{ backgroundImage: `url("${previewUrl}")` }}
          />
          <div className="upload-preview-overlay" />
          <div className="upload-file-info">
            <span className="upload-file-icon"><FileImage size={17} /></span>
            <span className="upload-file-details">
              <strong>{file.name}</strong>
              <small>{fileSize} · {file.type.split("/")[1]?.toUpperCase()}</small>
            </span>
            {!isUploading && (
              <button className="upload-remove" type="button" onClick={clearFile} aria-label="Remove selected image">
                <X size={16} />
              </button>
            )}
          </div>
          {isUploading && (
            <div className="upload-progress-wrap" aria-live="polite">
              <div className="upload-progress-copy">
                <span>Uploading your product photo</span>
                <span>{progress}%</span>
              </div>
              <div
                className="upload-progress-track"
                role="progressbar"
                aria-label="Image upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {!isUploading && (
            <button
              className="upload-change"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <RotateCcw size={13} /> Replace image
            </button>
          )}
        </div>
      ) : (
        <div
          className={`upload-dropzone${isDragging ? " is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
          }}
          onDrop={onDrop}
        >
          <div className="upload-art">
            <span className="upload-art-orbit upload-art-orbit-a" />
            <span className="upload-art-orbit upload-art-orbit-b" />
            <span className="upload-art-icon"><ImagePlus size={25} /></span>
            <span className="upload-art-sparkle"><Sparkles size={13} /></span>
          </div>
          <h2>Drop your product photo here</h2>
          <p>Give your product its own moment. A clear, well-lit photo works best.</p>
          <button
            className="button button-light upload-browse"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={15} /> Browse files
          </button>
          <span className="upload-file-rules">PNG, JPG OR WEBP <i /> UP TO 10 MB</span>
        </div>
      )}

      {error && (
        <div className="upload-error" role="alert">
          <span><X size={13} /></span>{error}
        </div>
      )}

      <div className="upload-actions">
        <div className="upload-privacy"><span><Check size={12} /></span>Private to your workspace</div>
        <button
          className="button button-primary upload-submit"
          type="button"
          disabled={!file || isUploading}
          onClick={onUpload}
        >
          {isUploading ? (
            <>Uploading <LoaderCircle className="upload-spinner" size={15} /> </>
          ) : (
            <>Continue <ArrowRight size={16} /></>
          )}
        </button>
      </div>

    </div>
  );
}
