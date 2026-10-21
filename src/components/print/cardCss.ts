// src/components/print/cardCss.ts
//
// CSS da cartela impressa. Tudo em "em" (1em = 10px no formato A4 4 por folha): a cartela escala sozinha para cada
// formato de folha. As cores vêm de variáveis (--bg, --frame, --l1…), definidas por cartela em CardFace.tsx.
// Classes com prefixo "cd-" para não colidir com o resto do sistema.

export const CARD_CSS = `
.cd{--s:1;font-size:calc(10px * var(--s));position:relative;display:flex;flex-direction:column;height:100%;width:100%;
  box-sizing:border-box;padding:.9em 1.1em .7em;border-radius:1.5em;overflow:hidden;
  background:var(--bg);border:.3em solid var(--frame);color:var(--text);font-family:Arial,Helvetica,sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;break-inside:avoid}
.cd *{box-sizing:border-box}
.cd p,.cd h2{margin:0}
.cd-deco{display:flex;height:1.3em;margin:-.9em -1.1em .7em;flex:none}
.cd-deco i{flex:1;display:block}
.cd-deco.bunting i{border-left:1.4em solid transparent;border-right:1.4em solid transparent;border-top:1.3em solid var(--dc)}
.cd-deco.dots{height:1.1em;align-items:center;gap:.35em;padding:0 .6em;margin-bottom:.8em}
.cd-deco.dots i{flex:none;width:.7em;height:.7em;border-radius:50%;background:var(--dc)}
.cd-hd{flex:none;padding-right:7.6em;min-height:7.6em} /* nunca mais baixo que o QR */
.cd-org{font-size:.95em;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text);opacity:.8;margin-bottom:.25em}
.cd-hd h2{font-family:Georgia,'DejaVu Serif','Times New Roman',serif;line-height:1.05;font-weight:800;color:var(--title);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.cd-when{font-size:1.1em;font-weight:700;margin-top:.4em}
.cd-cause{font-size:1.05em;font-style:italic;margin-top:.2em;opacity:.9;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cd-qr{position:absolute;top:.9em;right:1.1em;text-align:center;width:6.4em}
.cd-qr img{display:block;width:6.2em;height:6.2em;background:#fff;padding:.2em;border:.1em solid #333}
.cd-qr span{display:block;font:700 .9em 'DejaVu Sans Mono','Courier New',monospace;margin-top:.2em;color:#000}
.cd-ribbon{flex:none;margin:.6em 0 .7em;padding:.4em .8em;text-align:center;border-radius:.7em;font-weight:900;
  letter-spacing:.14em;font-size:1.2em;text-transform:uppercase;background:var(--rbg);color:var(--rfg);border:.25em solid var(--rbd)}
.cd-ribbon small{display:block;font-size:.8em;letter-spacing:.02em;font-weight:700;text-transform:none;margin-top:.1em}
.cd-grid{flex:1;min-height:0;display:flex;flex-direction:column}
.cd-letters{flex:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.3em;padding-bottom:.3em}
.cd-letters div{text-align:center;font-weight:900;font-size:1.9em;line-height:1.5;color:#fff;border-radius:.35em}
.cd-letters div:nth-child(1){background:var(--l1)}.cd-letters div:nth-child(2){background:var(--l2)}
.cd-letters div:nth-child(3){background:var(--l3)}.cd-letters div:nth-child(4){background:var(--l4)}
.cd-letters div:nth-child(5){background:var(--l5)}
.cd-cells{flex:1;min-height:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:repeat(5,minmax(0,1fr));gap:.3em;padding-bottom:.15em}
.cd-cells div{display:flex;align-items:center;justify-content:center;font-weight:900;font-size:2.5em;background:#fff;
  border:.15em solid var(--cb);color:var(--cf);border-radius:.4em;overflow:hidden}
.cd-cells .free{flex-direction:column;font-size:2.1em;line-height:1;background:var(--fb);color:var(--ff);border-color:var(--fbd)}
.cd-cells .free small{font-size:.4em;font-weight:800;letter-spacing:.08em;margin-top:.15em}
.cd-bw .cd-cells .free{background:repeating-linear-gradient(45deg,#e4e4e4,#e4e4e4 .3em,#fff .3em,#fff .6em)}
.cd-prize{flex:none;margin-top:.6em;font-size:1.05em;line-height:1.25;font-weight:700;text-align:center}
.cd-sp{flex:none;margin-top:.5em;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.3em .9em;
  font-size:1.05em;max-height:5.2em;overflow:hidden}
.cd-sp em{font-style:normal;opacity:.75}
.cd-sp b{font-weight:800;color:var(--title)}
.cd-sp img{height:2.2em;max-width:8em;object-fit:contain}
.cd-bw .cd-sp img{filter:grayscale(1)}
.cd-stub{flex:none;margin-top:.6em;padding-top:.6em;border-top:.15em dashed #777;font-size:1.05em;display:flex;gap:.6em;align-items:flex-end}
.cd-stub .cut{font-size:1.3em;line-height:1}
.cd-stub .line{flex:1;border-bottom:.1em solid #444;height:1.5em;min-width:3em}
.cd-stub .id{font:700 .9em 'DejaVu Sans Mono','Courier New',monospace;margin-left:.2em;color:#000}
.cd-compact .cd-hd{padding-right:6.6em}
.cd-compact .cd-ribbon{font-size:1.3em}
.cd-compact .cd-ribbon small{display:none}
`;
