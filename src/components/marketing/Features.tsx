// src/components/marketing/Features.tsx
// Melhorado — copy do anti-fraude mais específico, texto dos cards mais denso

export default function Features() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-yellow-400 uppercase tracking-widest text-xs font-bold">
            Tudo incluso
          </span>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black leading-tight">
            Feito para quem organiza<br />eventos beneficentes.
          </h2>
          <p className="mt-5 text-lg text-zinc-400 leading-relaxed">
            Não é um sistema genérico adaptado. O SeuEvento foi construído especificamente para igrejas, paróquias, associações e ONGs que vivem a realidade dos bingos beneficentes no interior.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">

          {/* CONTROLE POR VOLUNTÁRIO */}
          <div className="bg-[#122b1c] border border-yellow-500/20 rounded-3xl p-8 hover:border-yellow-500/40 transition-colors">
            <div className="text-4xl mb-5">👥</div>
            <h3 className="text-2xl font-black mb-3">Controle por voluntário</h3>
            <p className="text-zinc-400 leading-relaxed mb-5">
              Saiba exatamente quem vendeu cada cartela, quanto arrecadou e quanto deve prestar de contas. Cada venda fica registrada no nome de quem vendeu — com separação automática entre Pix e dinheiro.
            </p>
            <ul className="space-y-2.5 text-sm">
              {["Histórico individual de vendas", "Ranking de arrecadação em tempo real", "Prestação de contas automática", "Lote de cartelas por voluntário"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-zinc-300">
                  <span className="text-emerald-400">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* TELÃO */}
          <div className="bg-[#122b1c] border border-white/8 rounded-3xl p-8 hover:border-white/15 transition-colors">
            <div className="text-4xl mb-5">📡</div>
            <h3 className="text-2xl font-black mb-3">Telão em tempo real</h3>
            <p className="text-zinc-400 leading-relaxed mb-5">
              Conecte qualquer TV ou projetor e o telão atualiza automaticamente a cada número sorteado. Exibe os patrocinadores, o histórico de pedras e a animação de vitória com confetti quando alguém ganha.
            </p>
            <ul className="space-y-2.5 text-sm">
              {["Atualização automática — sem F5", "Compatível com qualquer TV ou projetor", "Logo dos patrocinadores em exibição", "Animação de vitória com confetti"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-zinc-300">
                  <span className="text-emerald-400">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* ANTI-FRAUDE */}
          <div className="bg-[#122b1c] border border-white/8 rounded-3xl p-8 hover:border-white/15 transition-colors">
            <div className="text-4xl mb-5">🔒</div>
            <h3 className="text-2xl font-black mb-3">Fiscal anti-fraude automático</h3>
            <p className="text-zinc-400 leading-relaxed mb-5">
              Quando alguém grita bingo, o fiscal escaneia a cartela no celular. Em menos de 1 segundo, o servidor verifica 4 critérios. Se qualquer um falhar, a cartela é recusada com o motivo na tela — sem discussão, sem constrangimento.
            </p>
            <ul className="space-y-2.5 text-sm">
              {[
                "Cartela existe neste evento?",
                "Cartela está paga?",
                "Números batem com os sorteados?",
                "Padrão correto para a rodada?",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-zinc-300">
                  <span className="text-emerald-400">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* RELATÓRIOS */}
          <div className="bg-[#122b1c] border border-white/8 rounded-3xl p-8 hover:border-white/15 transition-colors">
            <div className="text-4xl mb-5">📊</div>
            <h3 className="text-2xl font-black mb-3">Fechamento em 1 clique</h3>
            <p className="text-zinc-400 leading-relaxed mb-5">
              Ao encerrar o evento, o relatório financeiro completo fica pronto em segundos. Total arrecadado, divisão por método de pagamento, resultado de cada voluntário. Nenhuma planilha para abrir no dia seguinte.
            </p>
            <ul className="space-y-2.5 text-sm">
              {["Total arrecadado por método", "Resultado individual por voluntário", "Exportação para PDF e impressão", "Prestação de contas imediata"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-zinc-300">
                  <span className="text-emerald-400">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Banner inferior — mantido do original, era o ponto forte */}
        <div className="mt-8 rounded-3xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-yellow-400 font-bold uppercase tracking-widest text-xs">Sem limites</span>
              <h3 className="mt-3 text-3xl font-black leading-tight">
                Cartelas ilimitadas.<br />Equipe ilimitada.<br />Sem taxa por venda.
              </h3>
              <p className="mt-4 text-zinc-400">
                Você paga pelo sistema. O dinheiro arrecadado no evento continua sendo 100% da sua organização.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[["∞", "Cartelas"], ["∞", "Voluntários"], ["0%", "Taxa"]].map(([n, l]) => (
                <div key={l} className="bg-black/20 rounded-2xl p-5 text-center">
                  <div className="text-3xl font-black text-yellow-400">{n}</div>
                  <div className="mt-2 text-sm text-zinc-400">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
