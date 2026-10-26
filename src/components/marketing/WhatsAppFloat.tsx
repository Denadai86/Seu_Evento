// src/components/marketing/WhatsAppFloat.tsx
"use client";

// Botão flutuante do WhatsApp, só nas páginas públicas (entra pelo layout de (marketing)).
// Número e link vêm do siteConfig: trocar o WhatsApp é só em src/config/site.ts.
//
// IMPORTANTE: o menu fica SEMPRE no DOM (só esconde com CSS). Antes ele era desmontado no clique
// do link; o React 19 aplica o setState antes do navegador seguir o link, e um <a> removido da
// página não navega. Por isso o fechamento também espera o clique terminar (setTimeout).

import { useEffect, useRef, useState } from "react";
import { whatsappLink } from "@/config/site";

const OPCOES = [
  {
    id: "contratar",
    titulo: "Quero contratar",
    descricao: "Planos, preços e como funciona",
    texto: "Olá! Vim pelo site do Seu Evento e quero saber mais para usar no meu evento.",
  },
  {
    id: "suporte",
    titulo: "Preciso de suporte",
    descricao: "Já uso o Seu Evento",
    texto: "Olá! Já uso o Seu Evento e preciso de suporte. Meu evento é: ",
  },
] as const;

export default function WhatsAppFloat() {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  // Fecha com Esc ou com clique fora
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    const onDown = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [aberto]);

  return (
    <div
      ref={raiz}
      className="fixed z-[60] flex flex-col items-end gap-3"
      style={{
        right: "calc(1rem + env(safe-area-inset-right, 0px))",
        bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        id="wa-menu"
        role="menu"
        aria-hidden={!aberto}
        className={`w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-yellow-500/15 bg-[#0f2119] p-2 text-white shadow-2xl shadow-black/50 transition duration-150 motion-reduce:transition-none ${
          aberto ? "visible translate-y-0 opacity-100" : "invisible pointer-events-none translate-y-1.5 opacity-0"
        }`}
      >
        <p className="px-3 pb-2 pt-1 text-sm text-white/60">Fale com a gente no WhatsApp</p>
        {OPCOES.map((op) => (
          <a
            key={op.id}
            role="menuitem"
            href={whatsappLink(op.texto)}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={aberto ? 0 : -1}
            onClick={() => setTimeout(() => setAberto(false), 0)}
            className="flex flex-col rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
          >
            <span className="font-bold">{op.titulo}</span>
            <span className="text-sm text-white/55">{op.descricao}</span>
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar opções de contato" : "Falar no WhatsApp"}
        aria-expanded={aberto}
        aria-controls="wa-menu"
        className="grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-yellow-400 motion-reduce:transition-none"
      >
        {aberto ? (
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Zm0 2a7.5 7.5 0 1 1-3.8 14l-.4-.2-2.4.6.7-2.3-.3-.4A7.5 7.5 0 0 1 12 4.5Zm-2.6 3.3c-.2 0-.5 0-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.8 2.1.8 2.6.7 3 .6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.4-.3-1.6-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1a6 6 0 0 1-3-2.6c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.4l-.7-1.8c-.2-.5-.4-.4-.6-.4h-.5Z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}