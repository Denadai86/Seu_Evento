export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="py-24"
    >
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center">
          <span className="text-yellow-400 uppercase tracking-widest text-sm font-bold">
            Como funciona
          </span>

          <h2 className="mt-4 text-4xl lg:text-5xl font-black">
            Três passos.
            <br />
            Evento rodando.
          </h2>
        </div>

        <div className="mt-16 grid lg:grid-cols-3 gap-6">

          <div className="bg-[#122b1c] rounded-3xl p-8">
            <div className="text-6xl font-black text-yellow-500/20">
              01
            </div>

            <h3 className="mt-4 text-2xl font-bold">
              Configure
            </h3>

            <p className="mt-4 text-zinc-400">
              Crie o evento, defina prêmios e cadastre a equipe.
            </p>
          </div>

          <div className="bg-[#122b1c] rounded-3xl p-8">
            <div className="text-6xl font-black text-yellow-500/20">
              02
            </div>

            <h3 className="mt-4 text-2xl font-bold">
              Venda
            </h3>

            <p className="mt-4 text-zinc-400">
              Voluntários vendem pelo celular.
            </p>
          </div>

          <div className="bg-[#122b1c] rounded-3xl p-8">
            <div className="text-6xl font-black text-yellow-500/20">
              03
            </div>

            <h3 className="mt-4 text-2xl font-bold">
              Sorteie
            </h3>

            <p className="mt-4 text-zinc-400">
              Telão ao vivo, validação e fechamento financeiro.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}