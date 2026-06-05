"use client";

import { useState, useTransition } from "react";
import { closeEventAndGenerateReport } from "@/actions/closeEvent";
import { XCircle, Download } from "lucide-react";

export default function CloseEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [showModal, setShowModal] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeEventAndGenerateReport(eventId);
      if (result.success) {
        setReport(result.report);
      } else {
        alert(result.message || "Erro ao fechar evento");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="mt-4 w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
      >
        <XCircle size={18} /> Encerrar Evento
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl max-w-lg w-full p-8">
            <h2 className="text-2xl font-black text-red-400 mb-2">Encerrar Evento</h2>
            <p className="text-slate-300 mb-8">
              Tem certeza que deseja encerrar <strong>{eventName}</strong>?
            </p>

            {report ? (
              <div className="bg-slate-800 rounded-2xl p-6 mb-6 text-sm">
                <h3 className="font-bold mb-4">Relatório Final</h3>
                <p><strong>Total Arrecadado:</strong> R$ {(report.totalRevenue / 100).toFixed(2)}</p>
                <p><strong>Cartelas Vendidas:</strong> {report.totalCardsSold}</p>
                <p className="mt-4 text-emerald-400 font-bold">Evento encerrado com sucesso!</p>
              </div>
            ) : (
              <button
                onClick={handleClose}
                disabled={isPending}
                className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-2xl font-black text-white disabled:opacity-50"
              >
                {isPending ? "Encerrando..." : "SIM, ENCERRAR EVENTO"}
              </button>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 py-3 text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}