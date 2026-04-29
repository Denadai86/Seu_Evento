import { prisma } from "../../../lib/prisma";
import { redirect } from "next/navigation";

export default async function TenantDashboardPage({ params }: { params: { subdomain: string } }) {
  // 1. Busca no banco de dados a organização baseada na URL
  const org = await prisma.organization.findUnique({
    where: { slug: params.subdomain },
    include: { events: true } // Já trazemos os eventos (bingos) dessa org
  });

  // 2. Se a URL estiver errada (ex: /dashboard de um slug que não existe), expulsa!
  if (!org) {
    redirect("/");
  }

  return (
    <div className="p-10 font-sans max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-12 border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800">{org.name}</h1>
          <p className="text-slate-500 font-mono text-sm mt-1">{org.slug}.acaoleve.com</p>
        </div>
        {/* Futuramente colocaremos a foto (UserButton) do Clerk aqui */}
        <div className="h-12 w-12 bg-slate-200 rounded-full border-2 border-slate-300"></div>
      </header>

      <main>
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-slate-800">Meus Eventos (Bingos)</h2>
           <button className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-all hover:-translate-y-0.5">
             + Novo Evento
           </button>
        </div>

        {org.events.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum evento ativo</h3>
            <p className="text-slate-500 mb-6">Você ainda não criou o bingo desta organização.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {org.events.map((evento) => (
              <div key={evento.id} className="p-6 border rounded-xl shadow-sm bg-white">
                <h3 className="font-bold text-lg">{evento.name}</h3>
                <p className="text-sm text-slate-500">Status: {evento.status}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}