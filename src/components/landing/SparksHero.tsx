"use client";
import React from "react";
import Link from "next/link";
import Sphere from "@/components/Sphere";

export default function SparksHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 mb-6 h-[360px] md:h-[420px] lg:h-[460px]">
      {/* Decorative sphere */}
      <div className="absolute inset-0 opacity-90">
        <Sphere sizePercentage={0.30} bottomPaddingPx={0} horizontalShift={0.0} />
      </div>

      {/* Gradient vignette for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/40" />

      {/* Content */}
      <div className="relative z-20 h-full px-6 py-8 md:py-10 lg:py-12 flex flex-col justify-end gap-5">
        <div className="max-w-3xl space-y-3 fade-in-up">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
            Explore Sparks. Converse with Living Theses.
          </h1>
          <p className="text-slate-200 md:text-lg">
            Ask compelling questions. Watch the Mind Map react in real time. Publish Sparks and join the Echoes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/explorer/theses/all" className="px-4 py-2 rounded-md btn-accent text-sm shadow hover:shadow-lg hover:brightness-110 transition-all duration-200">
            Browse All Theses
          </Link>
          <Link href="/imprinter/thesis/new" className="px-4 py-2 rounded-md bg-white/10 text-white text-sm border border-white/20 hover:bg-white/15 transition-all duration-200">
            Create a Thesis
          </Link>
        </div>
      </div>

      {/* Subtle bottom glow */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[60%] h-40 rounded-full blur-3xl opacity-40 bg-sky-500/50" />
    </section>
  );
}
