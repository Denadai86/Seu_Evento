"use client";
import { useState } from "react";
import { createOperator, deleteOperator } from "@/actions/tenant";

export default function OperatorManager({ orgId, initialOperators }: { orgId: string, initialOperators: any[] }) {
  const [ops, setOps] = useState(initialOperators);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newOp = await createOperator(orgId, user, pass);
    setOps([...ops, newOp]);
    setUser(""); setPass("");
  };

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm mb-8">
      <h3 className="font-bold text-slate-800 mb-4">Gerenciar Locutores</h3>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input value={user} onChange={e => setUser(e.target.value)} placeholder="Usuário" className="border p-2 rounded-lg flex-1"/>
        <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Senha" title="Senha" className="border p-2 rounded-lg flex-1"/>
        <button className="bg-slate-900 text-white px-4 rounded-lg font-bold">Criar Acesso</button>
      </form>
      <div className="space-y-2">
        {ops.map((o: any) => (
          <div key={o.id} className="flex justify-between p-2 border-b text-sm">
            <span>👤 <b>{o.username}</b> (Senha: {o.password})</span>
            <button onClick={() => deleteOperator(o.id).then(() => setOps(ops.filter((x:any)=>x.id !== o.id)))} className="text-red-500">Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}