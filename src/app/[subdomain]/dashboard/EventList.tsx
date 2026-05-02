//src/app/[subdomai]/dashboard/EventList.tsx

"use client";

import { useTransition } from "react";
import { createEvent } from "@/actions/event";

interface Event {
  id: string;
  name: string;
  status: string;
}

export default function EventList({
  initialEvents,
}: {
  initialEvents: Event[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    const name = prompt("Nome do evento:");
    if (!name) return;

    startTransition(async () => {
      try {
        const res = await createEvent(name);

        if (!res.success) {
          alert("Erro ao criar evento");
        }
        // NÃO precisa setState → revalidatePath resolve
      } catch (err) {
        alert("Erro inesperado");
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Meus Eventos
        </h2>

        <button
          onClick={handleCreate}
          disabled={isPending}
          className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-all disabled:opacity-50"
        >
          {isPending ? "Criando..." : "+ Novo Evento"}
        </button>
      </div>

      {initialEvents.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            Nenhum evento
          </h3>
          <p className="text-slate-500">
            Crie seu primeiro bingo 🎯
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialEvents.map((evento) => (
            <div
              key={evento.id}
              className="p-6 border rounded-xl shadow-sm bg-white flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-lg">
                  {evento.name}
                </h3>
                <p className="text-sm text-slate-500">
                  Status: {evento.status}
                </p>
              </div>

              <a
                href={`/dashboard/${evento.id}`}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
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