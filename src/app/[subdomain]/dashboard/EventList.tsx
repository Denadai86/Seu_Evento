"use client";

import { useState } from "react";
import { createEvent } from "../.././actions"; // Caminho corrigido com 3 pontinhos!

export default function EventList({ orgId, initialEvents }: { orgId: string, initialEvents: any[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const eventName = prompt("Qual será o nome deste Evento? (Ex: Bingo da Padroeira 2026)");
    if (!eventName) return;

    setLoading(true);
    const newEvent = await createEvent(orgId, eventName);
    setEvents([...events, newEvent]); // Atualiza a tela na hora
    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Meus Eventos (Bingos)</h2>
        {/* AQUI FICA SÓ O BOTÃO DE NOVO EVENTO */}
        <button 
          onClick={handleCreate}
          disabled={loading}
          className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          {loading ? "Criando..." : "+ Novo Evento"}
        </button>
      </div>

      {events.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum evento ativo</h3>
          <p className="text-slate-500 mb-6">Você ainda não criou o bingo desta organização.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((evento) => (
            <div key={evento.id} className="p-6 border rounded-xl shadow-sm bg-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{evento.name}</h3>
                <p className="text-sm text-slate-500">Status: {evento.status}</p>
              </div>
              
              {/* O LINK DE GERENCIAR VEM PARA CÁ, AO LADO DO NOME DO EVENTO! */}
              <a 
                href={`/dashboard/${evento.id}`}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Gerenciar
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}