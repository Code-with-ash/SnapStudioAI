"use client";

import { useState } from "react";
import Image from "next/image";
import { Columns2 } from "lucide-react";

type ImageComparisonProps = {
  originalUrl: string;
  generatedUrl: string;
  originalLabel?: string;
  generatedLabel?: string;
};

export function ImageComparison({
  originalUrl,
  generatedUrl,
  originalLabel = "Original",
  generatedLabel = "AI scene",
}: ImageComparisonProps) {
  const [split, setSplit] = useState(50);

  return (
    <section className="comparison-section" aria-label="Compare original and generated image">
      <div className="comparison-heading">
        <span className="eyebrow"><Columns2 size={13} /> BEFORE / AFTER</span>
        <span>Drag the slider to compare</span>
      </div>
      <div className="comparison-stage">
        <Image
          src={generatedUrl}
          alt={generatedLabel}
          fill
          sizes="(max-width: 700px) 100vw, 760px"
          unoptimized
          className="comparison-photo"
        />
        <div className="comparison-before" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <Image
            src={originalUrl}
            alt={originalLabel}
            fill
            sizes="(max-width: 700px) 100vw, 760px"
            unoptimized
            className="comparison-photo"
          />
        </div>
        <span className="comparison-label comparison-label-before">{originalLabel}</span>
        <span className="comparison-label comparison-label-after">{generatedLabel}</span>
        <span className="comparison-divider" style={{ left: `${split}%` }}>
          <span />
        </span>
        <input
          className="comparison-slider"
          type="range"
          min={0}
          max={100}
          value={split}
          aria-label="Compare original with generated image"
          onChange={(event) => setSplit(Number(event.currentTarget.value))}
        />
      </div>
    </section>
  );
}
