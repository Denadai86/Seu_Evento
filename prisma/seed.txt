// prisma/seed.ts

// ❌ APAGUE ESSA LINHA: import { PrismaClient } from '@prisma/client';
// ❌ APAGUE ESSA LINHA: const prisma = new PrismaClient();

// ✅ USE A SUA INSTÂNCIA PRONTA COM NEON:
import prisma from '../src/lib/prisma'; 
import { hash } from 'bcryptjs';

async function main() {
  console.log('🌱 Iniciando o seed do banco de dados...');

  // Sua senha mestra criptografada
  const hashedPassword = await hash('admin123', 10);
  
  // Seu e-mail do Google (SEMPRE em minúsculas no banco)
  const seuEmail = 'jaodena@gmail.com'.toLowerCase(); 

  const superAdmin = await prisma.user.upsert({
    where: { email: seuEmail },
    update: { password: hashedPassword },
    create: {
      email: seuEmail,
      name: 'João (Admin Ação Leve)',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
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
    // Desconecta de forma segura
    await prisma.$disconnect();
  });
  