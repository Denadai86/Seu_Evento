// src/components/manual/HelpButton.tsx
"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X, ExternalLink } from "lucide-react";
import { getTopic } from "@/lib/manual/content";

// "?" que abre o assunto numa GAVETA por cima da tela atual. Quem está vendendo no PDV não pode perder o carrinho
// por ter aberto o manual: a gaveta fecha e a tela está exatamente como estava.
export default function HelpButton({ topicId, label = "Ajuda" }: { topicId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const topic = getTopic(topicId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!topic) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${topic.title}`}
        title={topic.title}
        className="flex items-center gap-1.5 text-xs bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 transition"
      >
        <HelpCircle size={14} /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label={topic.title}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111827] border border-slate-700 w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-xl font-black text-white leading-tight">{topic.title}</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-2 -mr-2 -mt-1 text-slate-400 hover:text-white" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">{topic.summary}</p>

            <ol className="space-y-3 mb-4">
              {topic.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-black flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-slate-200 leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            {(topic.warnings ?? []).map((w, i) => (
              <p key={`w${i}`} className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-2">{w}</p>
            ))}
            {(topic.tips ?? []).map((t, i) => (
              <p key={`t${i}`} className="text-xs text-sky-200 bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 mb-2">{t}</p>
            ))}

            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
              <a href={`/manual/${topic.id}`} target="_blank" rel="noopener" className="flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300">
                Abrir no manual <ExternalLink size={12} />
              </a>
              <a href="/manual" target="_blank" rel="noopener" className="font-bold text-slate-400 hover:text-slate-200">Outros assuntos</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
