import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllOrganizations } from "../../actions"; // Importe suas actions

export default async function AdminPage() {
  const { userId, sessionClaims } = await auth();

  // 1. Bloqueio de Segurança
  // Verificamos se o usuário está logado e se o metadata 'role' é SUPER_ADMIN
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  //if (!userId || role !== "SUPER_ADMIN") {
  //  redirect("/"); // Expulsa para a home se não for você
 // }

  // 2. Carrega os dados (Server Component)
  const orgs = await getAllOrganizations();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-black text-slate-900 mb-8">Dashboard Mestre</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {orgs.map((org: any) => (
          <div key={org.id} className="border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-bold">{org.name}</h2>
            <p className="text-sm text-slate-500 font-mono mb-4">{org.slug}.acaoleve.com</p>
            <div className="flex gap-2">
               <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold">Gerenciar</button>
               <button className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold">Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}