// src/lib/projectorSync.ts
//
// Sincronia INSTANTÂNEA entre a mesa do locutor e o telão quando os dois estão no MESMO
// navegador e na mesma origem (ex.: telão aberto como pop-up / outra janela do Firefox no
// notebook ligado ao HDMI). Não passa pela rede: o telão atualiza no mesmo instante.
// O polling (SWR) continua funcionando como reserva para telão em OUTRO aparelho.

export type SyncMessage =
  | { type: "refresh" }
  | {
      type: "draw";
      drawnNumbers: number[];
      currentSponsor: unknown;
      nextSponsor: unknown;
    };

const channelName = (eventId: string) => `seuevento:bingo:${eventId}`;
const supported = () => typeof window !== "undefined" && "BroadcastChannel" in window;

export function notifyProjector(eventId: string, message: SyncMessage = { type: "refresh" }) {
  if (!supported()) return;
  try {
    const channel = new BroadcastChannel(channelName(eventId));
    channel.postMessage(message);
    channel.close();
  } catch {
    // sem BroadcastChannel (ou bloqueado): o polling cobre
  }
}

export function listenProjector(eventId: string, onMessage: (message: SyncMessage) => void) {
  if (!supported()) return () => {};
  const channel = new BroadcastChannel(channelName(eventId));
  channel.onmessage = (event) => {
    if (event.data && typeof event.data === "object") onMessage(event.data as SyncMessage);
  };
  return () => channel.close();
}
