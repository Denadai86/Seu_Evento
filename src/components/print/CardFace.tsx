// src/components/print/CardFace.tsx
//
// A CARTELA IMPRESSA. Um componente só, usado na impressão, na amostra e no editor de modelo: o que o
// organizador vê na amostra é exatamente o que sai no papel. Sem estado: serve no servidor e no navegador.

import type { CSSProperties } from "react";
import type { BingoMatrix } from "@/lib/bingoRules";
import { kindCaption, resolveColors, titleSize, whenWhere, type CardDesign, type CardKind } from "@/lib/cardDesign";

export type CardFaceSponsor = { id: string; name: string; logoUrl: string | null };

export type CardFaceProps = {
  design: CardDesign;
  kind: CardKind;
  matrix: BingoMatrix;
  shortId: string;
  qrCodeDataUrl: string;
  eventName: string;
  organization?: string | null; // nome da organização (paróquia, ONG…): dá identidade à cartela
  sponsors: CardFaceSponsor[];
  prizesText: string;
  compact?: boolean; // formato pequeno: só o essencial (sem texto miúdo)
  scale?: number;
};

const LETTERS = ["B", "I", "N", "G", "O"] as const;

export default function CardFace({
  design, kind, matrix, shortId, qrCodeDataUrl, eventName, organization, sponsors, prizesText, compact = false, scale = 1,
}: CardFaceProps) {
  const c = resolveColors(design, kind);
  const caption = kindCaption(kind);
  const where = whenWhere(design);
  const showOrg = !compact && !!organization && organization.trim().toLowerCase() !== eventName.trim().toLowerCase();
  const showSponsors = design.showSponsors && !compact && sponsors.length > 0;
  const showPrizes = design.showPrizes && !compact && !!prizesText;
  const showStub = design.stub.enabled && !compact;

  const vars = {
    "--s": scale, "--bg": c.bg, "--title": c.title, "--text": c.text, "--frame": c.frame,
    "--rbg": c.ribbonBg, "--rfg": c.ribbonFg, "--rbd": c.ribbonBorder,
    "--cb": c.cellBorder, "--cf": c.cellFg, "--fb": c.freeBg, "--ff": c.freeFg, "--fbd": c.freeBorder,
    "--l1": c.letters[0], "--l2": c.letters[1], "--l3": c.letters[2], "--l4": c.letters[3], "--l5": c.letters[4],
  } as CSSProperties;

  const decoCount = c.decoration === "bunting" ? 14 : 22;

  return (
    <div className={`cd ${c.bw ? "cd-bw" : ""} ${compact ? "cd-compact" : ""}`} style={vars}>
      {c.decoration !== "none" && !compact && (
        <div className={`cd-deco ${c.decoration}`} aria-hidden>
          {Array.from({ length: decoCount }, (_, i) => (
            <i key={i} style={{ "--dc": c.decoColors[i % c.decoColors.length] } as CSSProperties} />
          ))}
        </div>
      )}

      <div className="cd-qr">
        <img src={qrCodeDataUrl} alt="QR Code da cartela" />
        <span>{shortId}</span>
      </div>

      <div className="cd-hd">
        {showOrg && <p className="cd-org">{organization}</p>}
        <h2 style={{ fontSize: `${titleSize(eventName) * (compact ? 1.1 : 1)}em` }}>{eventName}</h2>
        {!compact && where && <p className="cd-when">{where}</p>}
        {!compact && design.cause && <p className="cd-cause">{design.cause}</p>}
      </div>

      <div className="cd-ribbon">
        {caption.label}
        <small>{caption.sub}</small>
      </div>

      <div className="cd-grid">
        <div className="cd-letters">{LETTERS.map((l) => <div key={l}>{l}</div>)}</div>
        <div className="cd-cells">
          {([0, 1, 2, 3, 4] as const).map((row) =>
            LETTERS.map((letter) => {
              const isFree = letter === "N" && row === 2;
              return isFree ? (
                <div key={`${letter}${row}`} className="free">★{!compact && <small>LIVRE</small>}</div>
              ) : (
                <div key={`${letter}${row}`}>{matrix[letter][row]}</div>
              );
            })
          )}
        </div>
      </div>

      {showPrizes && <p className="cd-prize">Prêmios: {prizesText}</p>}

      {showSponsors && (
        <div className="cd-sp">
          <em>Apoio:</em>
          {sponsors.slice(0, 5).map((s) =>
            s.logoUrl ? <img key={s.id} src={s.logoUrl} alt={s.name} /> : <b key={s.id}>{s.name}</b>
          )}
        </div>
      )}

      {showStub && (
        <div className="cd-stub">
          <span className="cut" aria-hidden>✂</span>
          {design.stub.name && (<><span>Nome:</span><span className="line" /></>)}
          {design.stub.phone && (<><span>Tel:</span><span className="line" /></>)}
          <span className="id">{shortId}</span>
        </div>
      )}
    </div>
  );
}
