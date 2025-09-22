# 🚀 Deploy NFSe Service - Vercel + Supabase

Guia completo para migrar o serviço de NFS-e para Vercel (serverless) + Supabase (PostgreSQL).

## 📋 Pré-requisitos

- [ ] Conta no [Vercel](https://vercel.com)
- [ ] Conta no [Supabase](https://supabase.com)
- [ ] Vercel CLI instalado: `npm i -g vercel`
- [ ] Repositório configurado no GitHub

## 🗄️ 1. Configuração do Supabase

### 1.1. Criar Projeto
1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Configure:
   - **Name**: `nfse-production`
   - **Database Password**: Anote para usar depois
   - **Region**: Escolha a mais próxima

### 1.2. Configurar Database URL
Após criar o projeto, encontre a connection string em **Settings > Database**:

```bash
postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres?schema=public&sslmode=require
```

### 1.3. Executar Migrations
```bash
# Configure a DATABASE_URL temporariamente
export DATABASE_URL="sua_url_do_supabase_aqui"

# Execute as migrations
npx prisma migrate deploy
```

## ⚙️ 2. Configuração do Vercel

### 2.1. Setup Automático (Recomendado)
Execute o script de configuração:

```bash
./scripts/setup-vercel.sh
```

### 2.2. Setup Manual
Se preferir configurar manualmente:

```bash
# 1. Login no Vercel
vercel login

# 2. Link o projeto
vercel link

# 3. Adicionar environment variables
vercel env add JWT_SECRET production
vercel env add DATABASE_URL production
vercel env add RETRY_WEBHOOK_TOKEN production
# ... outras variáveis conforme necessário
```

### 2.3. Variáveis Obrigatórias
Configure estas variáveis no painel do Vercel:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `JWT_SECRET` | Secret para JWT (32+ chars) | `seu_jwt_secret_seguro` |
| `DATABASE_URL` | URL do Supabase | `postgresql://postgres:...` |
| `RETRY_WEBHOOK_TOKEN` | Token para cron jobs | `token_seguro_retry` |
| `NODE_ENV` | Ambiente | `production` |

### 2.4. Variáveis Opcionais
| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `ALLOWED_ORIGINS` | Domínios CORS | `*` |
| `AGENT_BASE_URL` | URL do agente externo | - |
| `CERT_PFX_PATH` | Caminho do certificado | - |
| `CERT_PFX_PASSWORD` | Senha do certificado | - |
| `METRICS_ENABLED` | Habilitar métricas | `1` |

## 🔧 3. Deploy

### 3.1. Deploy de Produção
```bash
vercel --prod
```

### 3.2. Verificar Deploy
Após o deploy, teste os endpoints:

```bash
# Health check
curl https://seu-projeto.vercel.app/health

# Documentação da API
curl https://seu-projeto.vercel.app/docs
```

## ⏰ 4. Cron Jobs (Background Tasks)

O serviço usa **Vercel Cron Jobs** para processamento em background:

### 4.1. Retry Service
- **Endpoint**: `/api/jobs/retry`
- **Frequência**: A cada 5 minutos
- **Função**: Reprocessa NFS-e pendentes

### 4.2. Configuração no vercel.json
```json
{
  "crons": [
    {
      "path": "/api/jobs/retry",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## 🔍 5. Monitoramento

### 5.1. Health Checks
```bash
# Saúde geral
GET /health

# Dependências (DB + Certificado)
GET /health/deps

# Liveness probe
GET /live

# Readiness probe  
GET /ready
```

### 5.2. Métricas
Se `METRICS_ENABLED=1`, métricas estarão disponíveis em `/metrics`.

### 5.3. Logs
Logs estão disponíveis no dashboard do Vercel em **Functions > View Function Logs**.

## 🛠️ 6. Troubleshooting

### 6.1. Problemas Comuns

#### Database Connection Issues
```bash
# Teste a conexão
npx prisma migrate status
```

#### Function Timeout
- Aumente `maxDuration` no `vercel.json`
- Otimize queries do Prisma
- Use connection pooling

#### Environment Variables
```bash
# Listar variáveis
vercel env ls

# Remover variável
vercel env rm VARIABLE_NAME production
```

### 6.2. Logs de Debug
Para debugging, configure:
```bash
vercel env add LOG_LEVEL production --value "debug"
```

### 6.3. Performance

#### Connection Pooling (Recomendado)
Configure no Supabase:
1. Vá para **Settings > Database**
2. Use a **Connection pooling URL** em vez da direct connection
3. Mode: `Transaction`

#### Prisma Optimization
```typescript
// Use connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "&connection_limit=1"
    }
  }
});
```

## 🔄 7. CI/CD

### 7.1. GitHub Actions
O projeto inclui workflows que executam:
- ✅ Testes automatizados
- ✅ Lint e type checking  
- ✅ Build da aplicação
- ✅ Deploy no merge para main

### 7.2. Preview Deployments
Branches e PRs geram deploys de preview automaticamente.

## 📚 8. Recursos Adicionais

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Prisma + Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

## 🆘 Precisa de Ajuda?

1. Verifique os logs no dashboard do Vercel
2. Teste health checks: `/health/deps`
3. Consulte este README
4. Abra uma issue no repositório

**Deploy URL**: https://seu-projeto.vercel.app