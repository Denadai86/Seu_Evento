// test-hash-production.ts
// Gera um hash para testar em produção com senha conhecida

import { hash } from 'bcryptjs';

async function generateTestHash() {
  // Vamos gerar hash com a MESMA senha que o seed usa
  const testPassword = 'admin123';
  
  console.log('Gerando hash para senha: admin123');
  const hashedPassword = await hash(testPassword, 10);
  
  console.log('\n✅ Hash gerado (use em SQL):');
  console.log(hashedPassword);
  
  console.log('\n📋 Query SQL para inserir usuário de teste:');
  console.log(`
INSERT INTO "users" (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  '${Date.now()}',
  'test-admin@acaoleve.dev.br',
  'Test Admin',
  '${hashedPassword}',
  'SUPER_ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET password = '${hashedPassword}';
  `);
}

generateTestHash().catch(console.error);
