// src/lib/unpaidAdvice.ts
//
// O que mostrar ao fiscal quando a cartela conferida NÃO está paga: com quem ela está e qual é o próximo passo.
// Função pura, com testes.
//
// DECISÃO DE SEGURANÇA: só se oferece "regularizar" quando a cartela TEM DONO (foi entregue a um voluntário que
// ainda não fez o acerto). Cartela que nunca foi entregue a ninguém NÃO ganha convite de venda: senão alguém
// poderia comprar a cartela vencedora DEPOIS de gritar bingo. Além disso, toda cartela conferida como não paga
// é registrada, e se ela for paga depois a auditoria destaca "pago após conferência".

export type UnpaidViewer = { userId: string | null; isAdmin: boolean; canSell: boolean; canTreasury: boolean };
export type UnpaidHolder = { staffId: string; userId: string; name: string } | null;

export type UnpaidAdvice = {
  headline: string; // frase para o fiscal (com o NOME do voluntário, quando houver)
  holderName: string | null;
  action: { label: string; href: string } | null; // convite discreto
  note: string; // linha pequena embaixo
};

export function unpaidCardAdvice(i: { eventId: string; code: string; holder: UnpaidHolder; viewer: UnpaidViewer }): UnpaidAdvice {
  const code = encodeURIComponent(i.code);

  // Sem dono: nada de convite de venda (ver decisão acima).
  if (!i.holder) {
    return {
      headline: "Esta cartela não foi entregue a nenhum voluntário e não tem venda registrada.",
      holderName: null,
      action: i.viewer.isAdmin ? { label: "Ver esta cartela no sistema", href: `/dashboard/${i.eventId}/cartelas?q=${code}` } : null,
      note: "Sem registro de venda, ela não pode ser premiada. Se alguém diz que pagou, o administrador precisa conferir.",
    };
  }

  const isHolder = !!i.viewer.userId && i.holder.userId === i.viewer.userId;
  const headline = isHolder
    ? "Esta cartela está com você e a venda ainda não foi registrada."
    : `Esta cartela está com ${i.holder.name} e a venda ainda não foi registrada.`;

  if (isHolder && i.viewer.canSell) {
    return {
      headline,
      holderName: i.holder.name,
      action: { label: "Regularizar agora: registrar a venda", href: `/vendas?cartela=${code}` },
      note: "Fica registrado na auditoria que o pagamento veio depois da conferência.",
    };
  }

  if (i.viewer.isAdmin || i.viewer.canTreasury) {
    return {
      headline,
      holderName: i.holder.name,
      action: {
        label: `Regularizar agora: receber o acerto de ${i.holder.name}`,
        href: `/dashboard/${i.eventId}/tesouraria?staff=${encodeURIComponent(i.holder.staffId)}&cartela=${code}`,
      },
      note: "Fica registrado na auditoria que o pagamento veio depois da conferência.",
    };
  }

  return {
    headline,
    holderName: i.holder.name,
    action: null,
    note: `Avise ${i.holder.name} ou a tesouraria para regularizar.`,
  };
}
