// src/components/marketing/Audience.tsx
// Reescrito — antes tinha emoji + título, zero texto. Agora fala com cada público.

export default function Audience() {
  const audiences = [
    {
      icon: "⛪",
      title: "Igrejas e Paróquias",
      description:
        "O bingo beneficente é a principal fonte de renda dos projetos sociais. Com o SeuEvento, a tesoureira tem o fechamento de caixa pronto antes de apagar as luzes do salão paroquial.",
      highlight: "Relatório pronto em 1 clique",
    },
    {
      icon: "🤝",
      title: "ONGs e Associações",
      description:
        "Voluntários diferentes a cada evento. O sistema gera um PIN na hora para qualquer pessoa atender o caixa — sem treinamento, sem burocracia.",
      highlight: "PIN gerado em segundos",
    },
    {
      icon: "🏘️",
      title: "Clubes e Sociedades",
      description:
        "Eventos recorrentes com patrocinadores locais. O logo de cada patrocinador aparece automaticamente no telão durante toda a noite, sem montar apresentação.",
      highlight: "Patrocinadores no telão automático",
    },
    {
      icon: "🎪",
      title: "Eventos Especiais",
      description:
        "Festa junina, arraiá beneficente, rifas de fim de ano. O SeuEvento adapta ao seu formato — quina, cartela cheia, ou as duas rodadas na mesma noite.",
      highlight: "Múltiplas rodadas num evento",
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-yellow-400 uppercase tracking-widest text-xs font-bold">
            Para quem é
          </span>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black leading-tight">
            Feito para quem arrecada<br />com propósito.
          </h2>
          <p className="mt-5 text-zinc-400 text-lg">
            Não importa o tamanho do evento. Se tem voluntário, cartela e um prêmio no final, o SeuEvento resolve.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="bg-[#122b1c] rounded-3xl p-8 border border-white/5 hover:border-yellow-500/20 transition-all group flex flex-col"
            >
              <div className="text-5xl mb-5">{a.icon}</div>

              <h3 className="font-black text-xl mb-3">{a.title}</h3>

              <p className="text-zinc-400 text-sm leading-relaxed flex-1 mb-5">
                {a.description}
              </p>

              <div className="text-xs font-bold text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/10 rounded-full px-3 py-1.5 inline-block self-start">
                ✓ {a.highlight}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
