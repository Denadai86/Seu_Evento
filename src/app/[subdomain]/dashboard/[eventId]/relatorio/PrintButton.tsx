// src/app/[subdomain]/dashboard/[eventId]/relatorio/PrintButton.tsx
"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-white font-bold transition"
    >
      <Printer size={18} /> IMPRIMIR PDF
    </button>
  );
}