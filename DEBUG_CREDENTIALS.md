# 🔍 Debug: Erro de Credenciais em Produção

## ✅ O Que Foi Corrigido

### Problema 1: Email com Case Incorreto
O `auth.ts` estava procurando com `.toLowerCase()` mas não normalizava antes de procurar.

**Fix:**
```typescript
// Antes (quebrado):
const identifier = (credentials.email as string).trim();
const user = await prisma.user.findFirst({
  where: { email: identifier.toLowerCase() }  // Procura em minúscula
});

// Depois (corrigido):
const identifier = (credentials.email as string).trim().toLowerCase();  // Normaliza ANTES
const user = await prisma.user.findFirst({
  where: { email: identifier }  // Procura normalizado
});
```

### Problema 2: Email no Seed Sem Normalização
O seed armazenava o email sem garantir que fosse minúsculo.

**Fix:**
```typescript
// Antes (quebrado):
const seuEmail = 'jaodena@gmail.com';

// Depois (corrigido):
const seuEmail = 'jaodena@gmail.com'.toLowerCase();
```

---

## 🧪 Como Testar Localmente

### Teste 1: Hash/Compare Funciona?

```bash
npx ts-node test-auth-debug.ts
```

Deve mostrar:
```
✅ bcryptjs está funcionando corretamente!
```

### Teste 2: Login em Localhost Funciona?

```bash
pnpm dev
```

Acesse http://localhost:3000/entrar e tente:
- Email: `jaodena@gmail.com` (minúsculas)
- Senha: `admin123`

Deve fazer login ✅

### Teste 3: Teste Várias Combinações

```
jaodena@gmail.com + admin123       → ✅ deve funcionar
JAODENA@GMAIL.COM + admin123       → ✅ deve funcionar (normalizado)
jaodena@gmail.com + senhaerrada    → ❌ deve falhar
```

---

## 🚀 Deploy em Produção

1. **Commit as mudanças:**
```bash
git add src/lib/auth.ts prisma/seed.ts
git commit -m "fix: normalizar email para case-insensitive em auth"
git push
```

2. **Aguarde redeploy na Vercel** (~3-5 minutos)

3. **Teste em produção:**
   - Acesse https://acaoleve.dev.br/entrar
   - Email: `jaodena@gmail.com`
   - Senha: `admin123`
   - Deve fazer login ✅

---

## 📋 Checklist

- [ ] Testei localmente com `pnpm dev` → login funciona
- [ ] Testei várias combinações de email (minúsculas, maiúsculas)
- [ ] Fiz commit das mudanças (auth.ts + seed.ts)
- [ ] Fiz push para main
- [ ] Esperei redeploy na Vercel
- [ ] Testei em produção → login funciona ✅

---

## 🆘 Se Ainda Não Funcionar

**Passo 1:** Verifique os logs da Vercel novamente
```
https://vercel.com/dashboard → projeto → Deployments → último build → Logs
```

**Passo 2:** Procure por erros de seed
```
"✅ Super Admin criado/verificado: jaodena@gmail.com"
```

Se estiver lá, o seed rodou. Então o problema é na validação.

**Passo 3:** Limpe cookies e tente em modo incógnito
```
Ctrl+Shift+N (ou Cmd+Shift+N no Mac)
Acesse https://acaoleve.dev.br/entrar
```

---

## 📚 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/auth.ts` | Normaliza email com `.toLowerCase()` |
| `prisma/seed.ts` | Armazena email normalizado no banco |
| `test-auth-debug.ts` | Script para testar bcryptjs localmente |

