# Deploy no Railway

## Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Projeto conectado ao GitHub

## Passo 1: Conectar Repositório

1. Acesse [Railway Dashboard](https://railway.app/dashboard)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Conecte sua conta GitHub e selecione o repositório `emissao-de-nota-automatica`

## Passo 2: Configurar PostgreSQL

Railway detectará automaticamente que você precisa de um banco PostgreSQL.

1. Railway criará automaticamente um serviço PostgreSQL
2. O `DATABASE_URL` será configurado automaticamente

## Passo 3: Configurar Variáveis de Ambiente

No painel do Railway, vá para a aba "Variables" do seu serviço e adicione:

```bash
JWT_SECRET=your_secure_jwt_secret_here
NODE_ENV=production
METRICS_ENABLED=1
# AGENT_BASE_URL=https://your-agent-url.com (opcional)
```

**Importante:** Use um JWT_SECRET forte e único para produção!

## Passo 4: Deploy

1. Railway fará o deploy automaticamente
2. Monitore os logs na aba "Deployments"
3. Assim que deployar, você verá a URL pública do seu app

## Passo 5: Verificar Deploy

1. Acesse a URL fornecida pelo Railway
2. Teste os endpoints básicos:
   - `GET /live` - Health check
   - `GET /ready` - Readiness check

## Configuração de Domínio (Opcional)

1. Vá para "Settings" > "Domains"
2. Adicione seu domínio customizado
3. Configure os registros DNS conforme instruído

## Troubleshooting

### Erro de Build
- Verifique se o Dockerfile está correto
- Certifique-se de que todas as dependências estão no package.json

### Erro de Database Connection
- Verifique se a variável `DATABASE_URL` está configurada
- Certifique-se de que o PostgreSQL service está saudável

### Erro de Prisma
- Execute `npx prisma generate` localmente primeiro
- Verifique se as migrações estão na pasta `prisma/migrations`

## Monitoramento

Railway fornece:
- Logs em tempo real
- Métricas de uso
- Alertas de erro
- Usage dashboard

## Escalabilidade

Railway escala automaticamente baseado no uso. Para controle manual:

1. Vá para "Settings" > "Scaling"
2. Ajuste CPU, RAM e réplicas conforme necessário

## Backup

Railway faz backup automático do PostgreSQL. Para exportar dados:

```bash
# Conectar ao banco via Railway CLI
railway connect

# Fazer dump do banco
pg_dump $DATABASE_URL > backup.sql
```

## Custos

- **Free Tier**: ~$5/mês para projetos pequenos
- **Pago**: Baseado no uso real (CPU, RAM, bandwidth)
- PostgreSQL incluído no plano gratuito até certos limites