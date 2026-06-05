// src/components/marketing/FAQ.tsx
// Reescrito — era estático com respostas de 1 linha. Agora tem accordion e perguntas reais.
"use client";

import { useState } from "react";

const items = [
  {
    q: "Os voluntários precisam baixar algum aplicativo?",
    a: "Não. O SeuEvento funciona 100% no navegador — Chrome, Safari, qualquer um. O voluntário abre o link no celular, digita o usuário e o PIN de 4 dígitos que você gerou, e já está no caixa. Nada para instalar.",
  },
  {
    q: "Minha tesoureira de 60 anos consegue usar?",
    a: "Essa é uma das perguntas que mais recebemos. A resposta honesta é: sim, se ela consegue usar o WhatsApp, ela consegue usar o SeuEvento. O caixa do voluntário é uma tela com dois botões: bipar cartela e finalizar venda. Simples assim.",
  },
  {
    q: "E se a internet cair no meio do evento?",
    a: "O telão continua exibindo o último estado até a conexão voltar. As vendas ficam bloqueadas temporariamente e o sistema avisa. Recomendamos ter um hotspot de celular como backup — algo que a maioria dos salões já tem hoje.",
  },
  {
    q: "Tem alguma taxa sobre as vendas do evento?",
    a: "Zero. Você paga uma taxa fixa pelo sistema e todo o dinheiro arrecadado no evento é 100% da sua organização. Não cobramos porcentagem sobre cartelas, não cobramos por voluntário, não cobramos por rodada. O que você vende é seu.",
  },
  {
    q: "Como o sistema impede fraude no ganhador?",
    a: "Quando alguém grita bingo, o fiscal escaneia a cartela. O sistema verifica automaticamente 4 critérios no servidor: a cartela existe neste evento, está paga, os números batem com os sorteados, e o padrão é o certo para a rodada (quina ou cartela cheia). Se qualquer critério falhar, a cartela é recusada com o motivo exibido na tela. Impossível de burlar pelo cliente.",
  },
  {
    q: "Posso gerar as cartelas e imprimir?",
    a: "Sim. O sistema gera as cartelas com código único e matriz matemática garantidamente diferente para cada uma. Você imprime em A4 (4 cartelas por folha) ou no formato A6 de gráfica. Cada cartela tem um código para bipar na venda e um QR Code para validar no momento da conferência.",
  },
  {
    q: "Posso usar em mais de um evento no ano?",
    a: "Sim. O Pacote 3 Eventos dá três usos para utilizar em até 12 meses — ideal para quem faz bingo todo trimestre. O Plano Anual é ilimitado para organizações com calendário cheio.",
  },
  {
    q: "Tem suporte se eu travar na configuração?",
    a: "Sim, via WhatsApp. O suporte está disponível nos planos Pacote e Anual. Para o Evento Único, o suporte está disponível por chat. E se mesmo com suporte não funcionar para você nos primeiros 7 dias, devolvemos o valor integralmente — sem burocracia.",
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

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  open === i ? "max-h-48" : "max-h-0"
                }`}
              >
                <div className="px-6 pb-5 text-zinc-400 leading-relaxed border-t border-white/5 pt-4">
                  {item.a}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
