// src/components/marketing/CTA.tsx
// Melhorado — headline mais específico, preço no botão, garantia de devolução

import {siteConfig} from "@/config/site";

export default function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">

        <div className="rounded-[40px] bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-12 lg:p-16 text-center relative overflow-hidden">

          {/* Glow decorativo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-yellow-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-block text-yellow-400 uppercase text-xs tracking-[.15em] font-bold mb-6 border border-yellow-400/20 bg-yellow-400/5 px-4 py-1.5 rounded-full">
              Pronto para começar?
            </span>

            <h2 className="text-4xl lg:text-5xl font-black leading-tight max-w-2xl mx-auto">
              Seu próximo bingo<br />
              <span className="text-yellow-400">sem planilha, sem confusão.</span>
            </h2>

            <p className="mt-6 text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
              Configure em 10 minutos. Seu evento roda com telão profissional, caixa por voluntário e fechamento automático — por menos de 2% do que você vai arrecadar.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href={siteConfig.urls.pricing}
                className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all px-10 py-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/25"
              >
                Começar por R$97 →
              </a>
              <a
                href={siteConfig.urls.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/15 hover:border-white/30 hover:bg-white/5 transition-all px-8 py-5 rounded-2xl font-bold flex items-center gap-2"
              >
                <span>💬</span> Falar no WhatsApp antes
              </a>
            </div>

            {/* Garantia */}
            <p className="mt-6 text-sm text-zinc-500">
              🔒 Garantia de 7 dias — se não funcionar para você, devolvemos 100% do valor. Sem pergunta.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
