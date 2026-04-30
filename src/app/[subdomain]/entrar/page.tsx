"use client";
import { useState } from "react";
import { loginOperator } from "../../actions";
import { useParams } from "next/navigation";

export default function LoginPage() {
  const { subdomain } = useParams();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await loginOperator(subdomain as string, user, pass);
    if (res.success) window.location.href = "/dashboard"; // Redireciona
    else alert(res.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-black text-slate-800 mb-6 text-center uppercase">Acesso Locutor</h1>
        <input value={user} onChange={e => setUser(e.target.value)} placeholder="Usuário" className="w-full border p-4 rounded-xl mb-3 outline-none focus:ring-2 ring-emerald-500"/>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Senha" title="Senha" className="w-full border p-4 rounded-xl mb-6 outline-none focus:ring-2 ring-emerald-500"/>
        <button className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-600 transition-all">ENTRAR NO SISTEMA</button>
      </form>
    </div>
  );
}