export default function VolunteerControl() {
  return (
    <section className="py-24 bg-[#122b1c]">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center max-w-3xl mx-auto">

          <span className="text-yellow-400 uppercase tracking-widest text-sm font-bold">
            Diferencial principal
          </span>

          <h2 className="mt-4 text-4xl lg:text-5xl font-black">
            Saiba exatamente
            quem arrecadou cada real.
          </h2>

          <p className="mt-6 text-zinc-400 text-lg">
            Cada cartela vendida fica vinculada ao voluntário responsável.
            Nada de anotações em papel ou conferência manual.
          </p>

        </div>

        <div className="mt-16 grid md:grid-cols-4 gap-6">

          <div className="rounded-2xl border border-white/10 p-6">
            <h3 className="font-bold">
              Quem vendeu
            </h3>

            <p className="mt-2 text-zinc-400">
              Histórico completo por vendedor.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 p-6">
            <h3 className="font-bold">
              Quanto arrecadou
            </h3>

            <p className="mt-2 text-zinc-400">
              Total vendido por pessoa.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 p-6">
            <h3 className="font-bold">
              Pix ou dinheiro
            </h3>

            <p className="mt-2 text-zinc-400">
              Separação automática por forma de pagamento.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 p-6">
            <h3 className="font-bold">
              Prestação de contas
            </h3>

            <p className="mt-2 text-zinc-400">
              Relatório pronto em segundos.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}