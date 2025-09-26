"use client";
import React from "react";
import Link from "next/link";
import ThesisSwitcher from "@/components/nav/ThesisSwitcher";

export default function AppNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link href="/explorer/theses" className="text-sm font-semibold text-white hover:opacity-90">ShodhAI</Link>

          <nav className="flex items-center gap-3 text-sm text-slate-200">
            <Link href="/explorer/theses" className="hover:text-white">Sparks</Link>
            <Link href="/explorer/theses/all" className="hover:text-white">All Theses</Link>
            <Link href="/imprinter/thesis/new" className="hover:text-white">Create Thesis</Link>
          </nav>

          <div className="flex-1" />

          {/* Quick Thesis Switcher + Studio shortcut */}
          <ThesisSwitcher />
        </div>
      </div>
    </header>
  );
}
