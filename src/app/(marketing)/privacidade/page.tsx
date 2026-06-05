import Navbar from "@/components/marketing/Navbar";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacidadePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 md:ml-80 bg-slate-50 min-h-screen py-20 px-8 lg:px-16">
        <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-3xl border border-slate-200 shadow-sm">
          
          <Link href="/" className="inline-flex items-center gap-2 text-emerald-600 font-bold mb-8 hover:text-emerald-700 transition-colors">
            <ArrowLeft size={18} /> Voltar para o início
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-2xl">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-4xl font-black text-slate-900">Políticas de Privacidade</h1>
          </div>
          
          <p className="text-slate-500 mb-10">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">A sua privacidade é importante para nós</h2>
              <p>É política do <b>Seu Evento (Ação Leve)</b> respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site, bem como em outras plataformas que possuímos e operamos.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Coleta de Dados</h2>
              <p>Solicitamos informações pessoais, como nome, e-mail e dados de contato, apenas quando realmente precisamos delas para lhe fornecer um serviço, como a criação do seu painel de organizador. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Retenção de Informações</h2>
              <p>Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados (como os dados de auditoria do seu evento), protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Compartilhamento de Dados</h2>
              <p>Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei. Os dados dos seus vendedores e do faturamento do seu evento são criptografados e acessíveis estritamente por você (Organizador).</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Direitos do Usuário</h2>
              <p>Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados. A qualquer momento, você pode solicitar a exclusão definitiva da sua conta e do histórico dos seus eventos entrando em contato com nosso suporte.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}