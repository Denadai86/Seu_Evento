"use client";

import { useState, useMemo, useTransition } from "react";
import { createOperator, deleteOperator } from "@/actions/tenant";
import { resetOperatorPassword } from "@/actions/operator";

interface Operator {
  id: string;
  name: string | null;
  email: string | null;
}

interface Props {
  initialOperators: Operator[];
}

export default function OperatorManager({ initialOperators }: Props) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const filtered = useMemo(() => {
    return initialOperators.filter((op) =>
      `${op.name} ${op.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search, initialOperators]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      await createOperator(name, email, password);
      setName("");
      setEmail("");
      setPassword("");
    });
  };

  const handleDelete = (id: string, name?: string | null) => {
    if (!confirm(`Remover ${name}?`)) return;

    startTransition(async () => {
      await deleteOperator(id);
    });
  };

  const handleReset = (id: string) => {
    if (!confirm("Resetar senha deste operador?")) return;

    startTransition(async () => {
      const res = await resetOperatorPassword(id);
      if (res.success) {
        alert(`Nova senha: ${res.password}`);
      }
    });
  };

  return (
    <div>
      <h3 className="font-bold text-lg mb-4 text-slate-800">
        Locutores
      </h3>

      {/* 🔎 BUSCA */}
      <input
        placeholder="Buscar operador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 p-2 border rounded-lg text-sm"
      />

      {/* ➕ FORM */}
      <form onSubmit={handleCreate} className="grid gap-2 mb-6">
        <input
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="p-2 border rounded"
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-2 border rounded"
        />
        <input
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="p-2 border rounded"
        />

        <button
          disabled={isPending}
          className="bg-slate-900 text-white py-2 rounded font-semibold"
        >
          {isPending ? "Criando..." : "Criar operador"}
        </button>
      </form>

      {/* 📊 TABELA */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Nome</th>
              <th>Email</th>
              <th>Status</th>
              <th className="text-right pr-4">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((op) => (
              <tr
                key={op.id}
                className="border-t hover:bg-slate-50"
              >
                <td className="p-3 font-medium">
                  {op.name || "—"}
                </td>

                <td>{op.email}</td>

                {/* 🟢 STATUS MOCK */}
                <td>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ativo
                  </span>
                </td>

                <td className="text-right pr-3 space-x-2">
                  <button
                    onClick={() => handleReset(op.id)}
                    className="text-blue-600 hover:underline"
                  >
                    Reset
                  </button>

                  <button
                    onClick={() => handleDelete(op.id, op.name)}
                    className="text-red-500 hover:underline"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-6 text-slate-400"
                >
                  Nenhum operador encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}