import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando protocolo de resgate do Super Admin...");

  // A sua nova senha provisória
  const novaSenha = "acaoleveadmin"; 
  
  // Criptografando a senha do mesmo jeito que o sistema faz
  const hashedPassword = await hash(novaSenha, 12);

  // Injetando no banco para todos os usuários com cargo SUPER_ADMIN
  const result = await prisma.user.updateMany({
    where: { role: 'SUPER_ADMIN' },
    data: { password: hashedPassword },
  });

  if (result.count > 0) {
    console.log(`✅ Sucesso! ${result.count} Super Admin(s) resgatado(s).`);
    console.log(`🔑 Sua nova senha provisória é: ${novaSenha}`);
    console.log("⚠️ Faça login e altere essa senha o quanto antes!");
  } else {
    console.log("❌ Nenhum usuário com perfil SUPER_ADMIN foi encontrado no banco.");
  }
}

main()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });