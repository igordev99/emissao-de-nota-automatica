# 🔧 Debug: Erro de Login Frontend

## 🚨 **Problema Reportado:**
- **Error:** "Erro ao fazer login" ao tentar login com usuário "tester"
- **Frontend:** https://ui-g356bdozv-gustavo-fernandes-projects-accf2b27.vercel.app
- **API:** https://emissao-de-nota-automatica-8epjtjjlo.vercel.app

---

## ✅ **Verificações Realizadas:**

### 1. **API Funcionando** ✅
```bash
# Teste direto da API - SUCESSO
curl -X POST "https://emissao-de-nota-automatica-8epjtjjlo.vercel.app/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"sub":"tester"}'

# Resposta: Token JWT válido + dados do usuário ✅
```

### 2. **CORS Configurado** ✅
```javascript
// API aceita qualquer domínio Vercel
origin: [/.*\.vercel\.app$/]
```

### 3. **URL da API Corrigida** ✅
```bash
# .env.production atualizado para:
VITE_API_URL=https://emissao-de-nota-automatica-8epjtjjlo.vercel.app
```

---

## 🔍 **Como Debuggar (Faça isso):**

### **Passo 1: Abra o Developer Tools**
1. Acesse: https://ui-g356bdozv-gustavo-fernandes-projects-accf2b27.vercel.app
2. Pressione **F12** (Chrome DevTools)
3. Vá na aba **Console**

### **Passo 2: Execute Debug Automático**
```javascript
// No console do navegador, digite:
debugLogin()

// Isso vai mostrar:
// - URL da API que está sendo usada
// - Resultado do health check
// - Detalhes do erro de login
```

### **Passo 3: Tente Login Normal**
1. Digite "tester" no campo
2. Clique "Entrar"
3. **Olhe o Console** - verá detalhes do erro
4. **Olhe a aba Network** - veja se a requisição foi enviada

---

## 🎯 **Possíveis Causas do Erro:**

### 🔴 **Mais Prováveis:**
1. **Cache do navegador** - URL antiga da API
2. **Problema de CORS** - Origin específica
3. **Variável de ambiente** não carregou

### 🟡 **Menos Prováveis:**
4. **Timeout de rede** 
5. **Problema no build** do Vite
6. **Interceptor HTTP** impedindo request

---

## 🔧 **Soluções Rápidas:**

### **Solução 1: Limpar Cache**
```
1. Ctrl+Shift+R (hard refresh)
2. Ou F12 > Network > Disable cache
3. Ou navegação anônima
```

### **Solução 2: Testar URL Direta**
```javascript
// No console do navegador:
fetch('https://emissao-de-nota-automatica-8epjtjjlo.vercel.app/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sub: 'tester' })
}).then(r => r.json()).then(console.log)
```

### **Solução 3: Verificar Variável de Ambiente**
```javascript
// No console:
console.log('API URL:', import.meta.env.VITE_API_URL)
```

---

## 📋 **Checklist de Diagnóstico:**

Execute e me informe os resultados:

- [ ] **Console mostra algum erro?** (F12 > Console)
- [ ] **Network tab mostra requisição?** (F12 > Network)
- [ ] **debugLogin() funciona?** (resultado no console)
- [ ] **Cache limpo?** (Ctrl+Shift+R)
- [ ] **API URL correta?** (deve ser emissao-de-nota-automatica-8epjtjjlo.vercel.app)

---

## 🚀 **URLs Atualizadas:**

- **Frontend:** https://ui-g356bdozv-gustavo-fernandes-projects-accf2b27.vercel.app
- **API:** https://emissao-de-nota-automatica-8epjtjjlo.vercel.app
- **Teste direto API:** https://emissao-de-nota-automatica-8epjtjjlo.vercel.app/health

---

## 💡 **Próximos Passos:**

1. **Execute o debug** no console (debugLogin())
2. **Copie os logs** e me envie
3. **Teste em navegador anônimo** 
4. **Verifique Network tab** para ver se requisição é feita

**Com essas informações posso identificar exatamente onde está o problema!**