# 🔐 Correção de Autenticação em Produção - Vercel

## ❌ Problema Identificado

Você tinha **dois secrets diferentes** para autenticação:
- `.env` (produção): `AUTH_SECRET=67ce60...` 
- `.env.local` (localhost): nenhum secret definido

Isso causava erro ao fazer login como super admin em produção porque:
1. O token JWT era gerado com um `AUTH_SECRET`
2. Na validação, era descodificado com outro `AUTH_SECRET` diferente
3. Resultado: "erro de credenciais" mesmo com dados corretos

---

## ✅ Solução Implementada

Criei um novo secret seguro **único** para AMBOS os ambientes:

```
AUTH_SECRET=7700f63e9d6117aa9cb7a7d94eb0172034c87a7383bab4ad475e6c2f24d91109
NEXTAUTH_SECRET=7700f63e9d6117aa9cb7a7d94eb0172034c87a7383bab4ad475e6c2f24d91109
```

### Arquivos Atualizados:
- ✅ `.env` (ambiente de produção)
- ✅ `.env.local` (localhost)

---

## 🚀 O Que Você Precisa Fazer na Vercel

### Passo 1: Acessar o Dashboard da Vercel
1. Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique no seu projeto `Seu_Evento` (ou o nome que você tiver configurado)

### Passo 2: Ir para Configurações de Variáveis de Ambiente
1. No menu lateral, clique em **"Settings"** (⚙️)
2. Depois clique em **"Environment Variables"**

### Passo 3: Atualizar o AUTH_SECRET
**Procure por `AUTH_SECRET`:**
- Se ele **já existe**: clique no ❌ para deletar o valor antigo
- Se **não existe**: clique em "Add New" para criar

**Adicione o novo valor:**
- **Name:** `AUTH_SECRET`
- **Value:** `7700f63e9d6117aa9cb7a7d94eb0172034c87a7383bab4ad475e6c2f24d91109`
- **Select environments:** Production (✓), Preview (✓), Development (✓)
- Clique em **"Save"**

### Passo 4: Atualizar NEXTAUTH_SECRET (opcional mas recomendado)
**Procure por `NEXTAUTH_SECRET`:**
- Se ele **já existe**: clique no ❌ para deletar o valor antigo
- Se **não existe**: clique em "Add New" para criar

**Adicione o novo valor:**
- **Name:** `NEXTAUTH_SECRET`
- **Value:** `7700f63e9d6117aa9cb7a7d94eb0172034c87a7383bab4ad475e6c2f24d91109`
- **Select environments:** Production (✓), Preview (✓), Development (✓)
- Clique em **"Save"**

### Passo 5: Verificar NEXTAUTH_URL (IMPORTANTE!)
**Procure por `NEXTAUTH_URL`:**
- Deve ser: `https://acaoleve.dev.br` (com HTTPS!)
- Se não estiver, adicione/corrija

---

## 🧪 Testes Locais

Antes de fazer deploy, teste em localhost:

```bash
# Limpe cache
pnpm install

# Execute localmente
pnpm dev
```

Agora tente fazer login:
- ✅ Email/Senha como super admin deve funcionar
- ✅ Token JWT será gerado com o novo secret

---

## 🔄 Deploy em Produção

Após atualizar as variáveis na Vercel:

1. **Redeploy automático:** Vercel fará redeploy automaticamente após salvar variáveis
   - Ou clique em **"Deployments"** → próximo build
   
2. **Limpe cookies do navegador** (importante!)
   - Abra DevTools (F12)
   - Application → Cookies → Delete `__Secure-authjs.session-token`
   - Ou acesse em modo privado/incógnito

3. **Teste login em produção:** https://acaoleve.dev.br/entrar

---

## 📋 Checklist Final

- [ ] Atualizei `AUTH_SECRET` na Vercel (dashboard Settings → Environment Variables)
- [ ] Atualizei `NEXTAUTH_SECRET` na Vercel (mesmo lugar)
- [ ] Verifiquei que `NEXTAUTH_URL` = `https://acaoleve.dev.br`
- [ ] Testei em localhost com `pnpm dev` (deve fazer login)
- [ ] Limpei cookies do navegador
- [ ] Testei em produção (https://acaoleve.dev.br/entrar)
- [ ] Super admin consegue fazer login ✅

---

## ⚠️ Importante

- **Nunca commite secrets** em `.env` (está em `.gitignore`)
- **Sempre use variáveis de ambiente** para secrets
- **Na Vercel:** prefira `AUTH_SECRET` sobre `NEXTAUTH_SECRET` (vide código: linha 109 de `src/lib/auth.ts`)

---

## 🆘 Se Ainda Tiver Erro

1. **Erro "Credenciais inválidas"**: 
   - Verifique se o usuário super admin existe no banco
   - Confirme a senha (bcrypt case-sensitive)

2. **Erro "NEXTAUTH_URL não configurado"**:
   - Deve estar em `https://acaoleve.dev.br` com HTTPS

3. **Cookies não salvam**:
   - Verifique `domain: .acaoleve.dev.br` em `src/lib/auth.ts` (linha 81)

