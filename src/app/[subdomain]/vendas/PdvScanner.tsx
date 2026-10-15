// src/app/[subdomain]/vendas/PdvScanner.tsx
"use client";

import { useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { extractCardCode } from "@/lib/qrCode";

// Lê o QR das cartelas com a câmera e vai colocando no carrinho, uma depois da outra.
// `onCode` devolve null se deu certo ou a mensagem de erro (cartela vendida, bloqueada, inexistente…).
export default function PdvScanner({ onCode, onClose }: { onCode: (code: string) => Promise<string | null>; onClose: () => void }) {
  const lastRef = useRef<{ key: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [added, setAdded] = useState(0);

  const show = (ok: boolean, text: string) => {
    setFeedback({ ok, text });
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ok ? [80, 40, 80] : 200);
  };

  const handleScan = async (result: any) => {
    if (!result || result.length === 0 || busyRef.current) return;
    const raw: string = String(result[0].rawValue ?? "");
    const code = extractCardCode(raw);
    const key = code ?? `invalido:${raw}`;

    // A câmera lê o mesmo QR várias vezes por segundo: ignora a repetição por 3 s.
    const now = Date.now();
    if (lastRef.current && lastRef.current.key === key && now - lastRef.current.at < 3000) return;
    lastRef.current = { key, at: now };

    if (!code) return show(false, "Este QR não é de uma cartela.");

    busyRef.current = true;
    const error = await onCode(code);
    busyRef.current = false;

    if (error) show(false, `${code}: ${error}`);
    else { setAdded((n) => n + 1); show(true, `${code} adicionada ao carrinho`); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-white font-black">Ler cartelas</p>
          <p className="text-xs text-slate-400">{added} adicionada{added === 1 ? "" : "s"} • aponte para o QR de cada cartela</p>
        </div>
        <button type="button" onClick={onClose} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-sm">
          <X size={16} /> Concluir
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl overflow-hidden border-4 border-emerald-500">
          <Scanner
            onScan={handleScan}
            onError={() => show(false, "Erro na câmera. Verifique a permissão do navegador.")}
            formats={["qr_code", "code_128"]}
            styles={{ container: { width: "100%", aspectRatio: "1/1" }, video: { objectFit: "cover" } }}
          />
        </div>
      </div>

      <div className="p-4 min-h-24">
        {feedback && (
          <div className={`max-w-md mx-auto flex items-center gap-3 p-4 rounded-2xl text-sm font-bold ${feedback.ok ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" : "bg-red-500/15 text-red-300 border border-red-500/40"}`}>
            {feedback.ok ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}
