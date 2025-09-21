# Guia de Deploy - Emissão de Nota Automática

## Visão Geral do Projeto

- **Backend**: Node.js + Fastify + TypeScript + Prisma
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Banco**: PostgreSQL
- **Containerização**: Docker + Docker Compose

## Opções de Deploy Recomendadas

### 1. 🚂 Railway (Recomendado para Iniciantes)

**Prós:**
- ✅ Deploy direto do GitHub
- ✅ PostgreSQL gerenciado incluído
- ✅ Suporte nativo a Docker
- ✅ Escalabilidade automática
- ✅ Plano gratuito generoso

**Contras:**
- ❌ Pode ser mais caro para uso intensivo
- ❌ Menos controle sobre infraestrutura

**Custo Estimado:**
- Gratuito: ~$5/mês para projetos pequenos
- Pago: $5-10/mês para uso moderado

**Setup:**
1. Conectar repositório GitHub
2. Railway detecta automaticamente o Docker
3. Adicionar PostgreSQL service
4. Configurar variáveis de ambiente

---

### 2. 🎨 Render

**Prós:**
- ✅ Free tier generoso (750h/mês)
- ✅ PostgreSQL gerenciado
- ✅ Suporte a Docker
- ✅ CDN global incluído
- ✅ Preview deployments

**Contras:**
- ❌ Serviços hibernam após inatividade
- ❌ Limite de 750h/mês no free tier

**Custo Estimado:**
- Gratuito: 750h/mês
- Pago: $7/mês (Web Service) + $7/mês (PostgreSQL)

**Setup:**
1. Conectar GitHub
2. Criar Web Service (Docker)
3. Criar PostgreSQL database
4. Configurar auto-deploy

---

### 3. 🛩️ Fly.io

**Prós:**
- ✅ Excelente performance global
- ✅ PostgreSQL opcional
- ✅ Controle total sobre infraestrutura
- ✅ IPv6 nativo
- ✅ CLI poderoso

**Contras:**
- ❌ Curva de aprendizado maior
- ❌ Menos "plug and play"

**Custo Estimado:**
- Gratuito: ~$2/mês (256MB RAM)
- Pago: $5-20/mês dependendo dos recursos

---

### 4. ☁️ Cloudflare Workers + D1 (Solução Moderna)

**Prós:**
- ✅ Performance excepcional global
- ✅ D1 (SQLite distribuído) como alternativa ao PostgreSQL
- ✅ Workers para backend serverless
- ✅ Pages para frontend
- ✅ Análise de tráfego gratuita

**Contras:**
- ❌ Migração do PostgreSQL para D1 pode ser complexa
- ❌ Workers têm limitações de runtime
- ❌ Menos familiar para desenvolvedores

**Custo Estimado:**
- Gratuito: 100k requests/dia
- Pago: $0.30 por 1M requests

---

### 5. 🏗️ Vercel + Supabase (Frontend + Backend Separados)

**Prós:**
- ✅ Vercel: Deploy frontend excelente
- ✅ Supabase: PostgreSQL gerenciado + Auth
- ✅ Integração perfeita
- ✅ Preview deployments

**Contras:**
- ❌ Dois serviços para gerenciar
- ❌ Migração do Prisma pode ser necessária

**Custo Estimado:**
- Gratuito: 100GB bandwidth + 500MB DB
- Pago: $20/mês (Vercel) + $25/mês (Supabase)

## Recomendação: Railway 🚂

Para este projeto, **Railway** é a melhor opção porque:

1. **Simplicidade**: Deploy direto do GitHub, sem configuração complexa
2. **PostgreSQL**: Banco gerenciado incluído
3. **Docker**: Suporte nativo ao seu Dockerfile existente
4. **Escalabilidade**: Cresce conforme necessário
5. **Custo**: Plano gratuito suficiente para desenvolvimento/teste

## Próximos Passos

1. Criar conta no Railway
2. Conectar repositório GitHub
3. Railway detectará automaticamente o projeto
4. Adicionar variáveis de ambiente necessárias
5. Deploy!

## Variáveis de Ambiente Necessárias

```bash
DATABASE_URL=postgresql://... # Fornecido pelo Railway
JWT_SECRET=your_secret_here
NODE_ENV=production
METRICS_ENABLED=1
```

## Alternativas se Railway não atender

- **Para performance máxima**: Fly.io
- **Para serverless moderno**: Cloudflare Workers + D1
- **Para simplicidade máxima**: Render
- **Para frontend + backend separados**: Vercel + Supabase