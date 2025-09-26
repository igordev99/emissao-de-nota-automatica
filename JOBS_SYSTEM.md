# 🔄 Sistema de Jobs/Retry - NFSe Serverless

## Visão Geral

O sistema de jobs/retry foi implementado de forma serverless-friendly, permitindo processamento em background de invoices pendentes que falharam na emissão inicial.

## 📊 Endpoints Disponíveis

### Health & Monitoring

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health/jobs` | GET | Status do sistema de jobs |
| `/jobs/stats` | GET | Estatísticas detalhadas |
| `/health/deps` | GET | Status completo (inclui jobs) |

### Processamento 

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/jobs/retry/process` | POST | Processar retries manualmente |
| `/jobs/retry/invoice` | POST | Retry de invoice específica |

## 🔧 Funcionalidades

### ✅ Processamento Automático
- **Detecção**: Invoices PENDING antigas (>24h por padrão)
- **Retry Logic**: Máximo 3 tentativas por invoice
- **Auto-Reject**: Após esgotar tentativas, marca como REJECTED
- **Logging**: Registra todas tentativas e resultados

### ✅ Estatísticas e Monitoramento
- **Pending Jobs**: Total de invoices pendentes
- **Old Pending**: Invoices que precisam de retry
- **Rejected**: Invoices que falharam definitivamente
- **Recent Errors**: Erros de retry nas últimas 24h

### ✅ Configuração
```javascript
{
  maxRetries: 3,        // Máximo de tentativas
  maxAgeHours: 24,      // Idade para considerar retry
  retryDelayMs: 30000   // Delay entre tentativas
}
```

## 🔄 Como Usar

### 1. Verificar Status
```bash
curl https://sua-api.vercel.app/health/jobs
```

### 2. Ver Estatísticas  
```bash
curl https://sua-api.vercel.app/jobs/stats
```

### 3. Processar Retries Manualmente
```bash
curl -X POST https://sua-api.vercel.app/jobs/retry/process
```

### 4. Retry de Invoice Específica
```bash
curl -X POST https://sua-api.vercel.app/jobs/retry/invoice \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "invoice-id-aqui"}'
```

## ⏰ Processamento Automático

### Opção 1: Vercel Cron Jobs
Adicionar ao `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/jobs/retry/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Opção 2: Webhook Externa
Configure um serviço externo para chamar:
```bash
curl -X POST https://sua-api.vercel.app/jobs/retry/process
```

### Opção 3: GitHub Actions
```yaml
- name: Process NFSe Retries
  run: |
    curl -X POST https://sua-api.vercel.app/jobs/retry/process
```

## 📈 Estados dos Jobs

| Estado | Descrição |
|--------|-----------|
| `healthy` | < 20 jobs pendentes antigas |
| `warning` | 20-50 jobs pendentes antigas |  
| `unhealthy` | > 50 jobs pendentes antigas |
| `error` | Falha no sistema de jobs |

## 🚨 Troubleshooting

### Jobs acumulando
1. Verificar `/health/jobs`
2. Executar `/jobs/retry/process`  
3. Analisar logs de erro

### Performance
- Limite de 50 jobs por execução
- Processamento sequencial para evitar sobrecarga
- Cache de conexão database

### Logs
Todas operações são logadas na tabela `logEntry`:
- Tentativas de retry
- Sucessos e falhas
- Mudanças de status

## 🔗 URLs de Teste

- **API**: https://emissao-de-nota-automatica-7q6mq0uy2.vercel.app
- **Jobs Stats**: `/jobs/stats`
- **Jobs Health**: `/health/jobs`
- **Process**: `/jobs/retry/process`