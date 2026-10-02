import type { Metadata } from "next";
import Link from "next/link";
import { Aperture, ArrowLeft, Sparkles } from "lucide-react";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = {
  title: "New photoshoot",
};

export default function NewProjectPage() {
  return (
    <main className="upload-page">
      <header className="upload-header">
        <Link className="workspace-brand" href="/dashboard" aria-label="Back to dashboard">
          <span className="workspace-brand-mark"><Aperture size={17} /></span>
          <span>snapstudio<span>.ai</span></span>
        </Link>
        <div className="upload-step-indicator">
          <span className="upload-step-active">01</span>
          <span className="upload-step-line" />
          <span>02</span>
          <span className="upload-step-line" />
          <span>03</span>
        </div>
        <Link className="upload-back-link" href="/dashboard">
          <ArrowLeft size={14} /> <span>Dashboard</span>
        </Link>
      </header>

      <section className="upload-main">
        <div className="upload-heading">
          <span className="eyebrow"><Sparkles size={13} /> YOUR NEXT CAMPAIGN STARTS HERE</span>
          <h1>Let’s start with<br /><span>the product.</span></h1>
          <p>One clear photo is all we need to set the scene.</p>
        </div>
        <UploadForm />
        <div className="upload-trust-row">
          <span><Sparkles size={13} /> Your image stays yours</span>
          <i />
          <span>Securely processed with Cloudinary</span>
        </div>
      </section>

      <footer className="upload-footer">
        <span>SNAPSTUDIO AI · MADE FOR WHAT’S NEXT</span>
        <span>01 / PRODUCT PHOTO</span>
      </footer>
    </main>
  );
}
