# 🔐 Fix: Super Admin Não Existe em Produção

## ❌ O Problema

Você consegue fazer login em **localhost** com `jaodena@gmail.com + admin123`, mas em **produção (https://acaoleve.dev.br)** recebe "erro de credenciais".

**Por quê?** O usuário super admin existe no banco LOCAL, mas **NÃO existe no banco de PRODUÇÃO (Neon)**.

```
✅ Localhost     → banco local com super admin (via seed)
❌ Produção      → banco Neon sem super admin (seed nunca foi executado)
```

---

## ✅ Solução Implementada

Atualizei `package.json` para executar o seed **automaticamente** durante o build na Vercel:

### Antes (quebrado):
```json
"build": "prisma generate && next build"
```

### Depois (funcionando):
```json
"build": "prisma generate && next build && prisma db seed"
```

---

## 🚀 Próximas Ações (O QUE VOCÊ PRECISA FAZER)

### Passo 1: Commit das Mudanças

```bash
# Terminal/PowerShell no repositório
git add package.json
git commit -m "feat: executar seed durante build em produção"
git push
```

Ou via GitHub Web:
1. Abra https://github.com/Denadai86/Seu_Evento
2. Encontre o arquivo `package.json`
3. Clique no botão edit (✏️)
4. Procure por `"build":`
5. Troque `"prisma generate && next build"` por `"prisma generate && next build && prisma db seed"`
6. Clique em **Commit changes**

### Passo 2: Vercel Faz Redeploy Automático

Assim que você fazer push/commit:
1. Vercel detecta a mudança
2. Clica em **Deployments** (https://vercel.com/dashboard)
3. Aguarda o novo build (que agora inclui `prisma db seed`)

**Logs que você verá (aproximadamente):**
```
▼ Building...
✓ prisma generate
✓ next build
✓ prisma db seed
  ✅ Super Admin criado/verificado: jaodena@gmail.com
```

### Passo 3: Teste em Produção

1. **Limpe cookies** (F12 → Application → Cookies → delete `__Secure-authjs.session-token`)
2. **Acesse** https://acaoleve.dev.br/entrar
3. **Use:**
   - Email: `jaodena@gmail.com`
   - Senha: `admin123`
4. **Deve fazer login** ✅

---

## 📋 Checklist Final

- [ ] Comitei a mudança no `package.json` (adicionei `prisma db seed` ao build)
- [ ] Fiz push para a main branch
- [ ] Verifiquei que Vercel iniciou novo deploy
- [ ] Limpei cookies do navegador
- [ ] Testei login em produção com `jaodena@gmail.com` + `admin123`
- [ ] Super admin conseguiu fazer login ✅

---

## 🆘 Se Ainda Não Funcionar

### Cenário 1: Vercel não executou o seed
**Solução:**
1. Abra https://vercel.com/dashboard
2. Clique no projeto
3. Vá em **Deployments**
4. Clique na última linha de log para expandir
5. Procure por "prisma db seed" nos logs
6. Se não aparecer, faça um novo deploy manualmente

### Cenário 2: Seed falhando com erro de conexão
**Checklist:**
- [ ] `DATABASE_URL` está em `Environment Variables` da Vercel
- [ ] O URL é do banco Neon (deve começar com `postgresql://`)
- [ ] Database está **ativa** (check no Neon dashboard)

### Cenário 3: Usuário super admin ainda não consegue logar
**Verifique:**
1. Email está correto: `jaodena@gmail.com` (com acento)
2. Senha: `admin123` (exatamente assim, case-sensitive)
3. Não há cookie antigo do browser (use modo incógnito)

---

## 📚 Referências

- **arquivo atualizado:** `package.json` (linha 7, script build)
- **seed script:** `prisma/seed.ts` (cria super admin se não existir)
- **dados de login:**
  - Email: jaodena@gmail.com
  - Senha: admin123 (hashada com bcrypt no banco)
  - Role: SUPER_ADMIN

---

## ℹ️ Por Que Isso Funciona

O seed (`prisma/seed.ts`) usa `upsert`, que significa:
- Se o usuário **não existe** → cria
- Se o usuário **já existe** → atualiza apenas a senha (se mudou)

Isso é seguro para executar multiple vezes. Não cria duplicatas.

```typescript
// De prisma/seed.ts:
const superAdmin = await prisma.user.upsert({
  where: { email: seuEmail },
  update: { password: hashedPassword },  // atualiza se existir
  create: {                               // cria se não existir
    email: seuEmail,
    name: 'João (Admin Ação Leve)',
    password: hashedPassword,
    role: 'SUPER_ADMIN',
  },
});
```

