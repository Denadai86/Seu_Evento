// src/lib/manual/types.ts
//
// Tipos do MANUAL DENTRO DO SISTEMA (central de ajuda). Só tipos: nada aqui executa.

export type ManualRole = "admin" | "vendedor" | "palco" | "fiscal" | "tesoureiro" | "conselho";

export type CategoryId = "comecar" | "vender" | "tesouraria" | "sorteio" | "evento" | "conselho" | "problemas";

export type Category = { id: CategoryId; title: string; description: string };

export type IconKey =
  | "cart" | "undo" | "users" | "package" | "wallet" | "ban" | "scan" | "mic"
  | "settings" | "alert" | "shield" | "key" | "book";

export type Topic = {
  id: string;
  title: string;
  summary: string;
  category: CategoryId;
  icon: IconKey;
  /** Quem precisa deste assunto. "todos" = qualquer pessoa logada. O administrador sempre pode ver tudo. */
  roles: ManualRole[] | "todos";
  /** Palavras que a busca deve achar (sem se preocupar com acento ou maiúscula). */
  keywords: string[];
  /** Passo a passo, curto, um passo por item. */
  steps: string[];
  tips?: string[];
  warnings?: string[];
  /** Ids de assuntos parecidos. */
  related?: string[];
  /** Destaque em "Comece por aqui" para quem tem esse papel. */
  featured?: boolean;
};
