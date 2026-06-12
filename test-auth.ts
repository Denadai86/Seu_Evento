// test-auth.ts — rode na raiz: npx tsx test-auth.ts
import "dotenv/config";

async function main() {
  console.log("\n========================================");
  console.log("🔍 DIAGNÓSTICO DE LOGIN - Seu Evento");
  console.log("========================================\n");

  // ── 1. ENV VARS ────────────────────────────────────────────────────────
  console.log("1️⃣  Variáveis de ambiente:");
  const dbUrl        = process.env.DATABASE_URL;
  const authSecret   = process.env.AUTH_SECRET;
  const nextSecret   = process.env.NEXTAUTH_SECRET;

  console.log("   DATABASE_URL    :", dbUrl      ? `✅ definida (${dbUrl.substring(0, 30)}...)` : "❌ AUSENTE");
  console.log("   AUTH_SECRET     :", authSecret  ? "✅ definida" : "❌ AUSENTE");
  console.log("   NEXTAUTH_SECRET :", nextSecret  ? "✅ definida" : "❌ AUSENTE");

  if (!authSecret && !nextSecret) {
    console.log("\n   ⚠️  NENHUM secret definido — NextAuth não consegue assinar tokens!\n");
  }

  if (!dbUrl) {
    console.log("\n❌ DATABASE_URL ausente. Abortando.\n");
    process.exit(1);
  }

  // ── 2. CONEXÃO COM BANCO ───────────────────────────────────────────────
  console.log("\n2️⃣  Testando conexão com o banco...");
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaNeon }   = await import("@prisma/adapter-neon");

  const adapter = new PrismaNeon({ connectionString: dbUrl });
  const prisma  = new PrismaClient({ adapter } as any);

  try {
    await prisma.$connect();
    console.log("   ✅ Conectado ao Neon com sucesso.");
  } catch (e: any) {
    console.log("   ❌ Falha na conexão:", e.message);
    process.exit(1);
  }

  // ── 3. BUSCA DO USUÁRIO ────────────────────────────────────────────────
  const EMAIL = "jaodena@gmail.com";
  console.log(`\n3️⃣  Buscando usuário: ${EMAIL}`);

  const user = await (prisma as any).user.findFirst({
    where: {
      OR: [
        { email:    EMAIL.toLowerCase() },
        { username: EMAIL.toUpperCase() },
      ],
    },
  });

  if (!user) {
    console.log("   ❌ Usuário NÃO encontrado no banco.");
    await prisma.$disconnect();
    return;
  }

  console.log("   ✅ Usuário encontrado:");
  console.log("      id       :", user.id);
  console.log("      email    :", user.email);
  console.log("      role     :", user.role);
  console.log("      tenantId :", user.tenantId ?? "(nulo — esperado para SUPER_ADMIN)");
  console.log("      password :", user.password
    ? `✅ ${user.password.length} chars | inicia com: ${user.password.substring(0, 10)}`
    : "❌ NULL");

  // ── 4. COMPARAÇÃO BCRYPT ───────────────────────────────────────────────
  if (!user.password) {
    console.log("\n❌ Campo password está NULL. Rode o seed novamente.");
    await prisma.$disconnect();
    return;
  }

  const SENHA = "admin123"; // ← troque se mudou a senha no seed
  console.log(`\n4️⃣  Comparando bcrypt para senha: "${SENHA}"`);

  const { compare } = await import("bcryptjs");
  const ok = await compare(SENHA, user.password);

  if (ok) {
    console.log("   ✅ Senha CORRETA! O problema não é de criptografia.");
    console.log("   👉 Verifique AUTH_SECRET e NEXTAUTH_SECRET no .env");
  } else {
    console.log("   ❌ Senha INCORRETA — hash no banco não bate com a senha testada.");
    console.log("   👉 Delete o usuário no Neon e refaça o seed com a senha correta.");
  }

  console.log("\n========================================\n");
  await prisma.$disconnect();
}

main().catch(console.error);