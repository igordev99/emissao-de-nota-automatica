# Guia de Deploy - Emissão de Nota Automática

## Visão Geral do Projeto

- **Backend**: Node.js + Fastify + TypeScript + Prisma
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Banco**: PostgreSQL
- **Containerização**: Docker + Docker Compose

## Opções de Deploy Recomendadas

### 1. � Supabase + Vercel (Recomendado)

**Prós:**
- ✅ PostgreSQL gerenciado pelo Supabase
- ✅ Deploy frontend no Vercel (ótimo para React)
- ✅ Integração perfeita entre serviços
- ✅ Preview deployments automáticos
- ✅ Escalabilidade automática
- ✅ Planos gratuitos generosos

**Contras:**
- ❌ Dois serviços para gerenciar (mas integração é seamless)

**Custo Estimado:**
- Gratuito: 100GB bandwidth (Vercel) + 500MB DB (Supabase)
- Pago: $20/mês (Vercel Pro) + $25/mês (Supabase Pro)

**Setup:**
1. Criar projeto no Supabase
2. Conectar repositório ao Vercel
3. Configurar variáveis de ambiente
4. Deploy automático

---

### 2. 🚂 Railway

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

## Recomendação: Supabase + Vercel �

Para este projeto, **Supabase + Vercel** é a melhor opção porque:

1. **PostgreSQL Gerenciado**: Supabase oferece PostgreSQL completo e gerenciado
2. **Vercel Integration**: Deploy perfeito para aplicações full-stack
3. **Prisma Ready**: Compatibilidade total com seu schema existente
4. **Escalabilidade**: Ambos escalam automaticamente conforme necessário
5. **Custo**: Planos gratuitos generosos para desenvolvimento/teste
6. **Developer Experience**: Ferramentas modernas e integração perfeita

## Próximos Passos

1. Criar projeto no Supabase (https://supabase.com)
2. Conectar repositório ao Vercel (https://vercel.com)
3. Executar migrações do Prisma no Supabase
4. Configurar variáveis de ambiente
5. Deploy automático!

## Configuração do Supabase

### 1. Criar Projeto
- Acesse https://supabase.com
- "New Project"
- Escolha região (recomendo São Paulo ou US East)
- Aguarde criação do banco

### 2. Configurar Banco
- Vá para "Settings" → "Database"
- Copie a `DATABASE_URL` (PostgreSQL connection string)
- Execute as migrações: `npx prisma migrate deploy`

### 3. Configurar Vercel
- Acesse https://vercel.com
- "Import Project" → Conecte seu repositório GitHub
- Configure build settings:
  - **Framework**: Other
  - **Root Directory**: `./` (raiz)
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`

## Variáveis de Ambiente Necessárias

```bash
DATABASE_URL=postgresql://... # Do Supabase
JWT_SECRET=your_secret_here
NODE_ENV=production
METRICS_ENABLED=1
```

## Alternativas se Supabase + Vercel não atender

- **Para monólito simples**: Railway (uma única plataforma)
- **Para performance máxima**: Fly.io
- **Para serverless moderno**: Cloudflare Workers + D1
- **Para simplicidade máxima**: Render