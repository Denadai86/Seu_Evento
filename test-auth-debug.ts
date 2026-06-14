// test-auth-debug.ts
// Execute localmente com: npx ts-node test-auth-debug.ts
// Isso vai mostrar se o hash/compare está funcionando corretamente

import { hash, compare } from 'bcryptjs';

async function testAuth() {
  console.log('🧪 Testando bcryptjs hash/compare...\n');

  const plainPassword = 'admin123';
  
  // Simula o que o seed.ts faz
  console.log('1️⃣ Hasheando senha "admin123" com salt rounds = 10');
  const hashedPassword = await hash(plainPassword, 10);
  console.log(`   Hash gerado: ${hashedPassword}\n`);

  // Simula o que auth.ts faz
  console.log('2️⃣ Comparando senha "admin123" com o hash');
  const isValid = await compare(plainPassword, hashedPassword);
  console.log(`   Resultado: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}\n`);

  // Testa senhas inválidas
  console.log('3️⃣ Comparando senha "senhaerrada" com o hash');
  const isInvalid = await compare('senhaerrada', hashedPassword);
  console.log(`   Resultado: ${isInvalid ? '✅ VÁLIDO (BUG!)' : '❌ INVÁLIDO (esperado)'}\n`);

  // Resultado final
  if (isValid && !isInvalid) {
    console.log('✅ bcryptjs está funcionando corretamente!');
    console.log('   A senha será validada corretamente em produção.');
  } else {
    console.log('❌ Há um problema com bcryptjs!');
    console.log('   Verifique se o pacote está instalado corretamente.');
  }
}

testAuth().catch(console.error);
