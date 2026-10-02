"use client";

import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import {
  Aperture,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Images,
  Layers3,
  Sparkles,
  WandSparkles,
} from "lucide-react";

const scenes = ["Studio", "Streetwear", "Quiet luxury", "Cafe", "Coastal", "Night city"];

const features = [
  {
    icon: Aperture,
    title: "Your product, understood",
    description:
      "Cloudinary analyzes the garment’s color, category, and details, so every scene starts with the right context.",
  },
  {
    icon: WandSparkles,
    title: "A campaign from one photo",
    description:
      "Turn a simple product shot into polished fashion imagery. No prompt writing or studio booking.",
  },
  {
    icon: Layers3,
    title: "Ready for every storefront",
    description:
      "Generate distinct looks and optimized images sized for social, ecommerce, and your website.",
  },
];

export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <main>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="SnapStudio AI home">
            <span className="brand-mark"><Aperture size={19} /></span>
            <span>snapstudio<span className="brand-ai">.ai</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="header-actions">
            <Link className="sign-in-link" href="/sign-in">Sign in</Link>
            <Link className="button button-small button-light" href="/sign-up">
              Get started <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>

        <section className="hero section-shell">
          <div className="hero-copy">
            <motion.div className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <span className="status-dot" /> THE AI PHOTOSHOOT STUDIO
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
            >
              Your next<br /><span>campaign</span><br />starts here.
            </motion.h1>
            <motion.p
              className="hero-description"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.18 }}
            >
              One product photo in. Editorial scene variations out. Cloudinary
              AI reads your image, preserves the product, and creates a new world around it.
            </motion.p>
            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
            >
              <Link className="button button-primary" href="/sign-up">
                Create your first shoot <ArrowRight size={17} />
              </Link>
              <a className="text-link" href="#how-it-works">
                See how it works <ArrowDown size={15} />
              </a>
            </motion.div>
            <div className="hero-note">
              <div className="avatar-stack" aria-hidden="true">
                <span className="avatar avatar-one" /><span className="avatar avatar-two" /><span className="avatar avatar-three" />
              </div>
              <p>Made for independent brands<span>Big campaign energy. Small-brand friendly.</span></p>
            </div>
          </div>
          <motion.div
            className="hero-art"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="hero-image hero-image-main" role="img" aria-label="Fashion model wearing a modern outfit" />
            <div className="hero-image hero-image-detail" role="img" aria-label="Editorial fashion portrait" />
            <div className="art-grain" />
            <div className="image-label">
              <span className="label-orbit"><Sparkles size={14} /></span>
              <span><strong>Studio / 04</strong><small>Campaign preview</small></span>
            </div>
            <div className="image-caption">THE EVERYDAY ICONS — 2025</div>
            <div className="floating-card">
              <span className="floating-icon"><Check size={14} /></span>
              <span><strong>Product analyzed</strong><small>Ready for its close-up</small></span>
            </div>
          </motion.div>
          <a href="#how-it-works" className="scroll-cue" aria-label="Scroll to how it works"><span /></a>
        </section>

        <section className="scene-strip" aria-label="Photoshoot scene ideas">
          <div className="scene-strip-inner">
            <span className="scene-label">A new setting for every story</span>
            <div className="scene-list">
              {scenes.map((scene) => <span className="scene-chip" key={scene}>{scene}</span>)}
            </div>
          </div>
        </section>

        <section className="intro-section section-shell" id="how-it-works">
          <motion.div
            className="section-heading"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
          >
            <span className="eyebrow">LESS SETUP. MORE STORY.</span>
            <h2>From flat lay<br />to <span>front page.</span></h2>
            <p>Great product photography shouldn’t be the thing holding your next collection back.</p>
          </motion.div>
          <div className="process-grid">
            <motion.article className="process-card process-upload" whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} viewport={{ once: true }}>
              <span className="process-number">01 / UPLOAD</span>
              <div className="product-frame">
                <div className="product-photo" role="img" aria-label="A clothing item ready to photograph" />
                <span className="frame-sparkle"><Sparkles size={15} /></span>
              </div>
              <div className="process-card-copy"><h3>Start with what you have.</h3><p>Upload one clear photo of your product. That’s the only setup.</p></div>
            </motion.article>
            <span className="process-connector" aria-hidden="true"><ArrowRight size={17} /></span>
            <motion.article className="process-card process-magic" whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} viewport={{ once: true }} transition={{ delay: 0.12 }}>
              <span className="process-number">02 / CREATE</span>
              <div className="magic-art">
                <div className="magic-orbit orbit-a" /><div className="magic-orbit orbit-b" />
                <span className="magic-star"><WandSparkles size={26} /></span>
                <span className="magic-tag tag-top">COLOR · TEXTURE</span><span className="magic-tag tag-bottom">LIGHT · MOOD</span>
              </div>
              <div className="process-card-copy"><h3>Let the ideas flow.</h3><p>AI reads your product and places it in a scene that feels considered.</p></div>
            </motion.article>
            <span className="process-connector" aria-hidden="true"><ArrowRight size={17} /></span>
            <motion.article className="process-card process-results" whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} viewport={{ once: true }} transition={{ delay: 0.24 }}>
              <span className="process-number">03 / DOWNLOAD</span>
              <div className="result-photos">
                <div className="result-photo result-photo-one" role="img" aria-label="Streetwear campaign image" />
                <div className="result-photo result-photo-two" role="img" aria-label="Studio campaign image" />
                <div className="result-photo result-photo-three" role="img" aria-label="Editorial campaign image" />
                <span className="result-count"><Images size={13} /> Your gallery</span>
              </div>
              <div className="process-card-copy"><h3>Make it yours.</h3><p>Pick your favorites, explore variations, and download for every channel.</p></div>
            </motion.article>
          </div>
        </section>

        <section className="feature-section" id="features">
          <div className="feature-inner section-shell">
            <motion.div className="feature-heading" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="eyebrow">BUILT FOR THE BIG IDEA</span>
              <h2>Everything you need.<br /><span>Nothing you don’t.</span></h2>
            </motion.div>
            <div className="feature-grid">
              {features.map(({ icon: Icon, title, description }, index) => (
                <motion.article
                  className="feature-card"
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="feature-card-top"><span className="feature-icon"><Icon size={19} /></span><span className="feature-number">0{index + 1}</span></div>
                  <h3>{title}</h3><p>{description}</p><span className="feature-line" />
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="closing-section section-shell">
          <div className="closing-card">
            <div className="closing-glow" />
            <div className="closing-copy">
              <span className="eyebrow"><Sparkles size={14} /> YOUR NEXT SHOOT IS WAITING</span>
              <h2>Make room<br />for <span>the good stuff.</span></h2>
              <p>Bring the product. We’ll bring the set.</p>
              <Link className="button button-primary" href="/sign-up">Start creating <ArrowRight size={17} /></Link>
            </div>
            <div className="closing-image" role="img" aria-label="Fashion editorial campaign portrait"><span>AN IDEA, IN FULL COLOR.</span></div>
          </div>
        </section>

        <section className="pricing-section section-shell" id="pricing">
          <div>
            <span className="eyebrow">GOOD THINGS ARE TAKING SHAPE</span>
            <h2>Pricing is <span>coming soon.</span></h2>
            <p>We’re building a plan that makes great creative accessible to every brand.</p>
          </div>
          <span className="coming-soon">COMING SOON <Sparkles size={14} /></span>
        </section>

        <footer className="site-footer">
          <Link className="brand" href="/" aria-label="SnapStudio AI home">
            <span className="brand-mark"><Aperture size={18} /></span><span>snapstudio<span className="brand-ai">.ai</span></span>
          </Link>
          <p>Good images make good things happen.</p>
          <span className="footer-copyright">© 2026 SnapStudio AI</span>
        </footer>
      </main>
    </MotionConfig>
  );
}
