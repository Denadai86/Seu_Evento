// src/components/manual/WelcomeGuide.tsx
"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, X } from "lucide-react";
import { markManualSeen } from "@/actions/manual";

// Aparece UMA vez, no primeiro acesso de cada pessoa. Não aparece no telão, na impressão nem no próprio manual.
const HIDDEN = /(^|\/)(projector|print|manual|entrar)(\/|$)/;

export default function WelcomeGuide({ firstName, roleLabels }: { firstName: string; roleLabels: string[] }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();

  if (!open || HIDDEN.test(pathname)) return null;

  const dismiss = (goToManual: boolean) =>
    start(async () => {
      await markManualSeen();
      setOpen(false);
      if (goToManual) router.push("/manual?bemvindo=1");
    });

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="relative bg-[#111827] border border-emerald-700/40 rounded-3xl p-7 w-full max-w-md shadow-2xl">
        <button
          type="button"
          onClick={() => dismiss(false)}
          disabled={pending}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
          <BookOpen size={28} />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Bem-vindo(a){firstName ? `, ${firstName}` : ""}!</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-1">
          {roleLabels.length > 0 ? (
            <>Separamos um guia rápido para o seu papel: <strong className="text-emerald-400">{roleLabels.join(", ")}</strong>.</>
          ) : (
            <>Separamos um guia rápido para você começar.</>
          )}
        </p>
        <p className="text-slate-500 text-xs mb-6">Leva poucos minutos, e você pode reabrir quando quiser em Ajuda.</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => dismiss(true)}
            disabled={pending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl transition disabled:opacity-60"
          >
            Ver o guia
          </button>
          <button
            type="button"
            onClick={() => dismiss(false)}
            disabled={pending}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-xl transition disabled:opacity-60"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
