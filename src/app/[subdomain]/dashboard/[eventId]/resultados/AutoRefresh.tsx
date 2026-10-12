// src/app/[subdomain]/dashboard/[eventId]/resultados/AutoRefresh.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Atualiza os números do painel sozinho enquanto o evento acontece (liga/desliga com um clique).
export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => {
      setSpinning(true);
      router.refresh();
      setTimeout(() => setSpinning(false), 800);
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [on, router, seconds]);

  return (
    <button
      type="button"
      onClick={() => { setSpinning(true); router.refresh(); setTimeout(() => setSpinning(false), 800); }}
      onContextMenu={(e) => { e.preventDefault(); setOn((v) => !v); }}
      title="Clique para atualizar agora. Botão direito liga/desliga a atualização automática."
      className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition"
    >
      <RefreshCw size={14} className={spinning ? "animate-spin" : ""} />
      {on ? `Ao vivo (a cada ${seconds}s)` : "Atualização pausada"}
    </button>
  );
}
