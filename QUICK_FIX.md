# ⚡ Quick Fix - Super Admin em Produção

## 🎯 O Que Fazer AGORA

```bash
# Terminal/PowerShell
cd seu-repo
git add package.json
git commit -m "fix: executar seed no build de produção para criar super admin"
git push
```

**Ou pelo GitHub Web:**
1. https://github.com/Denadai86/Seu_Evento/edit/main/package.json
2. Na linha do `"build":`
3. Troque `"prisma generate && next build"` 
4. Por: `"prisma generate && next build && prisma db seed"`
5. Clique Commit

---

## ⏱️ Tempo Estimado

- **Commit + Push:** 1 minuto
- **Vercel rebuild:** 2-3 minutos
- **Total:** ~5 minutos

---

## ✅ Resultado

Após o rebuild, o super admin será criado automaticamente:

```
Email: jaodena@gmail.com
Senha: admin123
Role: SUPER_ADMIN
```

E você conseguirá fazer login em produção! 🎉

---

## 📖 Documentação Completa

Veja `FIX_SUPER_ADMIN_PRODUCTION.md` para detalhes e troubleshooting.

