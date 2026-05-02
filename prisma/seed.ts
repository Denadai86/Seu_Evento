// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o seed do banco de dados...');

  // Sua senha mestra criptografada. Mude 'admin123' para uma senha segura.
  const hashedPassword = await hash('admin123', 10);
  
  // Coloque o seu e-mail do Google aqui. Isso permite que você logue 
  // tanto digitando a senha quanto clicando em "Entrar com Google".
  const seuEmail = 'jaodena@gmail.com'; 

  const superAdmin = await prisma.user.upsert({
    where: { email: seuEmail },
    update: {},
    create: {
      email: seuEmail,
      name: 'João (Admin Ação Leve)',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      // tenantId fica nulo, pois você é o dono da plataforma inteira, não um cliente
    },
  });

  console.log(`✅ Super Admin criado/verificado: ${superAdmin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });