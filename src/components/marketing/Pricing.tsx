// src/components/marketing/Pricing.tsx

import { plans } from "@/config/plans";

export default function Pricing() {
  return (
    <section
      id="planos"
      className="py-24 bg-[#122b1c]"
    >
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center">
          <span className="text-yellow-400 uppercase tracking-widest text-sm font-bold">
            Planos simples
          </span>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black">
            Sem mensalidade.
            <br />
            Pague apenas quando precisar.
          </h2>
        </div>

        <div className="mt-16 grid lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={
                plan.featured
                  ? "relative border-2 border-yellow-400 rounded-3xl p-8 bg-[#091510] scale-105 shadow-2xl"
                  : "border border-white/10 rounded-3xl p-8"
              }
            >
              {plan.featured && plan.featuredLabel && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-black">
                  {plan.featuredLabel}
                </div>
              )}

              <h3 className="text-2xl font-black">{plan.name}</h3>

              <div
                className={`mt-6 font-black ${
                  plan.featured
                    ? "text-6xl text-yellow-400"
                    : "text-5xl"
                }`}
              >
                R${plan.price}
              </div>

              <ul
                className={`mt-8 space-y-3 ${
                  plan.featured ? "" : "text-zinc-400"
                }`}
              >
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>

              <button
                className={`mt-8 w-full py-4 rounded-xl font-bold transition ${
                  plan.featured
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "border border-white/10"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
