// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// 1. Criamos uma função que instancia o Prisma Client com as configurações desejadas
const prismaClientSingleton = () => {
  return new PrismaClient({
    // Mantive os logs, adicionei 'error' e 'warn' para termos visibilidade total no terminal
    log: ["query", "error", "warn"], 
  });
};

// 2. Declaramos no escopo global do Node.js a nossa variável.
// O uso do 'var' aqui é obrigatório pelas regras do TypeScript para o globalThis.
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// 3. O Singleton: Se já existir uma instância global, usamos ela. 
// Se não existir (primeira vez rodando), instanciamos chamando a função.
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// 4. Exportação Padrão (Default Export). 
// É isso que resolve o erro "has no default export" que você tomou.
export default prisma;

// 5. Prevenção de vazamento de conexão em Desenvolvimento
// No ambiente de produção (Vercel), o Next.js não faz HMR, então isso é ignorado.
if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}