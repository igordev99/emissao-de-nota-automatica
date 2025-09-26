# 🔐 Guia de Configuração do Certificado Digital

## Certificado Atual (Status: Mock/Demo)

O sistema está configurado com um **certificado mock** para demonstração. Para usar um certificado real, siga os passos abaixo.

## 📋 Como Configurar Certificado Real

### 1. Preparar o Certificado PFX

Você precisa de um arquivo `.pfx` ou `.p12` válido com:
- Certificado digital A1 (para NFSe)
- Chave privada incluída
- Senha do certificado

### 2. Converter para Base64

```bash
# Se você tem o arquivo local (certificado.pfx):
base64 -i certificado.pfx -o certificado.base64

# Ou em uma linha:
base64 certificado.pfx > certificado.base64
```

### 3. Configurar no Vercel

```bash
# Configurar o certificado base64
vercel env add CERT_PFX_BASE64 production

# Colar o conteúdo do arquivo .base64 quando solicitado

# Configurar a senha (se houver)
vercel env add CERT_PFX_PASSWORD production
# Digite a senha do certificado

# Fazer novo deploy
vercel --prod
```

### 4. Verificar Configuração

Após deploy, teste:

```bash
# Verificar se o certificado foi carregado
curl https://sua-api.vercel.app/health/cert

# Verificar todas as dependências  
curl https://sua-api.vercel.app/health/deps
```

## 🔍 Estados do Certificado

| Status | Descrição |
|--------|-----------|
| `valid` | Certificado carregado e válido |
| `expiring_soon` | Válido mas expira em < 30 dias |
| `expired` | Certificado expirado |
| `not_configured` | Sem certificado configurado |
| `error` | Erro no carregamento |

## 🚨 Troubleshooting

### Erro: "Too few bytes to parse DER"
- Verifique se o base64 está completo
- Confirme que é um arquivo PFX/P12 válido

### Erro: "Invalid PFX content"  
- Verifique a senha do certificado
- Confirme que o arquivo não está corrompido

### Status "not_configured"
- Verifique se `CERT_PFX_BASE64` está definida
- Confirme que fez deploy após configurar

## 📊 URLs para Teste

- **API com Certificado**: https://emissao-de-nota-automatica-gqfsy8k9e.vercel.app
- **Frontend Dashboard**: https://ui-ten-xi.vercel.app
- **Verificação de Certificado**: `/health/cert`
- **Status Completo**: `/health/deps`