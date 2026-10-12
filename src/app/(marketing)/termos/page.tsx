import Navbar from "@/components/marketing/Navbar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 md:ml-80 bg-slate-50 min-h-screen py-20 px-8 lg:px-16">
        <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-3xl border border-slate-200 shadow-sm">
          
          <Link href="/" className="inline-flex items-center gap-2 text-emerald-600 font-bold mb-8 hover:text-emerald-700 transition-colors">
            <ArrowLeft size={18} /> Voltar para o início
          </Link>

          <h1 className="text-4xl font-black text-slate-900 mb-4">Termos de Uso</h1>
          <p className="text-slate-500 mb-10">Última atualização: {siteConfig.legalUpdatedAt}</p>

          <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Aceitação dos Termos</h2>
              <p>Ao acessar e usar a plataforma "Seu Evento" (Ação Leve), você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concorda com algum destes termos, está proibido de usar ou acessar este site.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Uso da Plataforma</h2>
              <p className="mb-3">A plataforma destina-se a facilitar a gestão e execução de sorteios e eventos beneficentes. Você concorda em usar o sistema apenas para fins lícitos e de maneira que não infrinja os direitos de, ou restrinja ou iniba o uso da plataforma por qualquer terceiro.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>É proibido usar a plataforma para jogos de azar ilegais não autorizados por lei.</li>
                <li>Você é o único responsável por garantir que o seu evento possui as liberações legais necessárias na sua jurisdição.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Pagamentos e Assinaturas</h2>
              <p>O uso da plataforma exige o pagamento prévio de um dos planos: Evento Único (1 evento, com acesso até 7 dias após a data do evento), 3 Eventos (3 eventos em até 12 meses) ou Anual (eventos ilimitados por 12 meses), contados a partir da liberação do acesso.</p>
              <p className="mt-3"><strong>Garantia e reembolso.</strong> Em até 7 dias corridos após a confirmação do pagamento, você pode pedir o reembolso integral, sem precisar de justificativa. Em até 30 dias corridos, o reembolso integral também é devido se nenhuma cartela tiver sido vendida no sistema. Fora dessas hipóteses, os valores não são reembolsáveis. O pedido é feito pelo WhatsApp.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Limitação de Responsabilidade</h2>
              <p>Em nenhum caso o Seu Evento (Ação Leve) será responsável por quaisquer danos (incluindo falhas de internet no local do evento, perda de dados ou lucros cessantes) decorrentes do uso ou da incapacidade de usar os materiais da plataforma.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Contato</h2>
              <p>
                Para dúvidas sobre estes termos, fale conosco pelo{" "}
                <a href={siteConfig.urls.whatsapp} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>
                {siteConfig.company.email && <> ou pelo e-mail <a href={`mailto:${siteConfig.company.email}`} className="underline">{siteConfig.company.email}</a></>}.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}