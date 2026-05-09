"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
    >
      <Printer size={18} /> Imprimir PDF
    </button>
  );
}