// src/components/marketing/FAQ.tsx
// Reescrito — era estático com respostas de 1 linha. Agora tem accordion e perguntas reais.
"use client";

import { useState } from "react";

const items = [
  {
    q: "Os voluntários precisam baixar algum aplicativo?",
    a: "Não. O Seu Evento funciona 100% no navegador — Chrome, Safari, qualquer um. O voluntário abre o link no celular, digita o usuário e o PIN de 6 dígitos que você gerou, e já está no caixa. Nada para instalar.",
  },
  {
    q: "Minha tesoureira de 60 anos consegue usar?",
    a: "Se ela usa o WhatsApp, consegue usar o Seu Evento. O caixa do voluntário é uma tela simples: ele digita o código de cada cartela vendida, escolhe a forma de pagamento e finaliza a venda.",
  },
  {
    q: "E se a internet cair no meio do evento?",
    a: "O sistema depende de internet e não funciona offline. Se a conexão cair, o telão mantém na tela o último estado, mas sorteio e vendas só voltam quando a internet voltar. Por isso recomendamos ter um hotspot de celular como reserva e testar a conexão do salão antes do evento.",
  },
  {
    q: "Tem alguma taxa sobre as vendas do evento?",
    a: "Zero. Você paga uma taxa fixa pelo sistema e todo o dinheiro arrecadado no evento é 100% da sua organização. Não cobramos porcentagem sobre cartelas, não cobramos por voluntário, não cobramos por rodada. O que você vende é seu.",
  },
  {
    q: "Como o sistema impede fraude no ganhador?",
    a: "Quando alguém grita bingo, o fiscal escaneia ou digita o código da cartela. A conferência acontece no servidor, não no aparelho do fiscal: o sistema verifica se a cartela existe neste evento, se está paga, se os números sorteados fecham o padrão da rodada (quina ou cartela cheia). Se algo não fechar, a cartela é recusada e o motivo aparece na tela.",
  },
  {
    q: "Posso gerar as cartelas e imprimir?",
    a: "Sim. O sistema gera as cartelas com código único e matriz matemática garantidamente diferente para cada uma. Você imprime em A4 (4 cartelas por folha) ou no formato A6 de gráfica. Cada cartela tem um código curto para o voluntário registrar a venda e um QR Code para validar na conferência.",
  },
  {
    q: "Posso usar em mais de um evento no ano?",
    a: "Sim. O plano 3 Eventos dá três eventos para usar em até 12 meses — ideal para quem faz bingo todo trimestre. O plano Anual tem eventos ilimitados por 12 meses, para organizações com calendário cheio. O Evento Único vale para um evento e o acesso continua por 7 dias depois da data dele, para você fechar o relatório.",
  },
  {
    q: "Tem suporte se eu travar na configuração?",
    a: "Sim, pelo WhatsApp, em todos os planos. E se mesmo com suporte não for para você, a garantia é de 7 dias com reembolso integral, sem perguntas. Se nenhuma cartela tiver sido vendida no sistema, o prazo é de até 30 dias.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-[#122b1c]">
      <div className="max-w-3xl mx-auto px-6">

        <div className="text-center mb-14">
          <span className="text-yellow-400 uppercase tracking-widest text-xs font-bold">
            Dúvidas frequentes
          </span>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black leading-tight">
            Perguntas que todo<br />mundo faz
          </h2>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/8 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-white/3 transition-colors"
                aria-expanded={open === i}
              >
                <span className="font-bold text-base leading-snug pr-2">
                  {item.q}
                </span>
                <span
                  className={`text-yellow-400 text-xl flex-shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {/* grid-rows 0fr→1fr: abre na altura REAL do texto (o max-h-48 antigo cortava respostas longas) */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ${
                  open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-5 text-zinc-400 leading-relaxed border-t border-white/5 pt-4">
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}