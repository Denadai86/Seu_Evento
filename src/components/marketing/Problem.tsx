export default function Problem() {
  return (
    <section
      id="problema"
      className="py-24 bg-[#091510]"
    >
      <div className="max-w-6xl mx-auto px-6">

        <div className="grid lg:grid-cols-2 gap-12 items-center">

          <div>
            <span className="text-yellow-400 uppercase tracking-widest text-sm font-bold">
              O problema
            </span>

            <h2 className="mt-4 text-4xl lg:text-5xl font-black leading-tight">
              Bingo na planilha
              <br />
              custa dinheiro.
            </h2>

            <p className="mt-6 text-zinc-400 text-lg">
              Quem organiza eventos beneficentes sabe:
              a dor não é no sorteio.
              É antes e depois.
            </p>

            <div className="mt-8 space-y-4">

              <div className="rounded-2xl border border-white/10 p-5">
                <h3 className="font-bold mb-2">
                  Cartela não paga tentando ganhar
                </h3>

                <p className="text-zinc-400">
                  Sem controle digital, a conferência vira discussão.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 p-5">
                <h3 className="font-bold mb-2">
                  Ninguém sabe quem vendeu o quê
                </h3>

                <p className="text-zinc-400">
                  Prestação de contas baseada em memória gera conflito.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 p-5">
                <h3 className="font-bold mb-2">
                  Fechamento financeiro demorado
                </h3>

                <p className="text-zinc-400">
                  Horas de planilha depois que o evento termina.
                </p>
              </div>

            </div>
          </div>

          <div className="bg-[#122b1c] border border-yellow-500/20 rounded-3xl p-8">

            <span className="text-yellow-400 font-bold uppercase text-sm tracking-widest">
              A solução
            </span>

            <h3 className="mt-4 text-3xl font-black">
              Controle total por voluntário.
            </h3>

            <p className="mt-6 text-zinc-400">
              Saiba exatamente quem vendeu,
              quanto arrecadou,
              quais cartelas vendeu
              e quanto recebeu em Pix ou dinheiro.
            </p>

            <div className="mt-8 space-y-4">

              <div>✓ Cada venda vinculada ao voluntário</div>

              <div>✓ Prestação de contas automática</div>

              <div>✓ Relatório financeiro instantâneo</div>

              <div>✓ Cartelas pagas validadas automaticamente</div>

              <div>✓ Tudo pelo navegador</div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}