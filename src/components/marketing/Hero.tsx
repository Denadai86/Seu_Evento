// src/components/marketing/Hero.tsx

import { siteConfig } from "@/config/site";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center">
      <div className="max-w-6xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-16 items-center">

        <div>
          <span className="text-yellow-400 uppercase text-sm tracking-widest font-bold">
            Para igrejas, ONGs e associações
          </span>

          <h1 className="mt-6 text-5xl lg:text-7xl font-black leading-none">
            Pare de correr atrás de cartela.
            <span className="block text-yellow-400">
              Comece a organizar eventos.
            </span>
          </h1>

          <p className="mt-8 text-lg text-zinc-400 max-w-xl leading-relaxed">
            Venda cartelas, acompanhe voluntários,
            valide ganhadores, controle pagamentos
            e apresente sorteios em um telão profissional.

            Tudo no navegador.
            Sem aplicativo.
            Sem planilhas.
            Sem dor de cabeça.
          </p>
          
          <div className="mt-10 flex flex-wrap gap-4">

          <a
            href={siteConfig.urls.pricing}
            className="bg-orange-500 hover:bg-orange-600 px-8 py-4 rounded-xl font-bold"
          >
            Começar por R$97
          </a>

          <a
            href={siteConfig.urls.howItWorks}
            className="border border-white/10 hover:border-white/30 px-8 py-4 rounded-xl"
          >
            Ver como funciona
          </a>

        </div>

          <div className="mt-8 flex gap-4 text-sm text-zinc-500 flex-wrap">
            <span>✓ Sem mensalidade</span>
            <span>✓ Sem taxa por cartela</span>
            <span>✓ Setup em 10 min</span>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="rounded-3xl border border-yellow-500/20 bg-[#122b1c] p-6 shadow-2xl">

            <div className="flex justify-between mb-8">
              <span className="text-yellow-400 font-bold">
                Mesa do Locutor
              </span>

              <span className="text-zinc-500">
                32 / 75 pedras
              </span>
            </div>

            <div className="w-32 h-32 rounded-full bg-yellow-400 text-black flex items-center justify-center text-5xl font-black mx-auto">
              47
            </div>

            <div className="mt-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              🎉 Cartela A9B2X1 está a 1 número do bingo
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}