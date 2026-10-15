// src/components/manual/PrintGuideButton.tsx
"use client";

import { Printer } from "lucide-react";

export default function PrintGuideButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition"
    >
      <Printer size={16} /> IMPRIMIR PDF
    </button>
  );
}
