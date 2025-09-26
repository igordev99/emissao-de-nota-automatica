# 🔐 Configuração do Certificado Digital para NFSe

## Como configurar o certificado PFX no Vercel

### 1. **Preparar o Certificado**

Para usar o certificado PFX no ambiente serverless do Vercel, você precisa convertê-lo para base64:

```bash
# No macOS/Linux:
base64 -i seu-certificado.pfx -o certificado-base64.txt

# No Windows (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("seu-certificado.pfx")) | Out-File -Encoding utf8 certificado-base64.txt
```

### 2. **Configurar Variáveis de Ambiente**

Execute os comandos no terminal:

```bash
# Adicionar o certificado em base64
vercel env add CERT_PFX_BASE64 production

# Adicionar a senha do certificado
vercel env add CERT_PFX_PASSWORD production

# Remover as variáveis antigas de path (não funcionam no serverless)
vercel env rm CERT_PFX_PATH production
vercel env rm CERT_PFX_PATH preview  
vercel env rm CERT_PFX_PATH development
```

### 3. **Atualizar o Código**

O código já está preparado para usar tanto arquivo local quanto base64. A lógica de carregamento verifica:

1. Se `CERT_PFX_BASE64` existe → usa o certificado em base64
2. Se `CERT_PFX_PATH` existe → tenta carregar o arquivo (apenas desenvolvimento local)

### 4. **Testar a Configuração**

Após configurar o certificado, teste em:

```bash
curl https://seu-app.vercel.app/health/cert
```

### 5. **Exemplo de Resposta de Sucesso**

```json
{
  "loaded": true,
  "thumbprint": "A1B2C3D4E5F6...",
  "hasPrivateKey": true,
  "notBefore": "2024-01-01T00:00:00.000Z",
  "notAfter": "2025-12-31T23:59:59.000Z",
  "daysToExpire": 365
}
```

## 📝 **Checklist de Configuração**

- [ ] Certificado PFX convertido para base64
- [ ] Variável `CERT_PFX_BASE64` configurada no Vercel
- [ ] Variável `CERT_PFX_PASSWORD` configurada no Vercel
- [ ] Variável `CERT_PFX_PATH` removida (se existir)
- [ ] Endpoint `/health/cert` retornando `"loaded": true`
- [ ] Endpoint `/health/deps` mostrando certificado OK

## ⚠️ **Importante**

- **Nunca** commite o arquivo .pfx ou a string base64 no Git
- Use sempre variáveis de ambiente para dados sensíveis
- Teste a validade do certificado regularmente
- Configure alertas para certificados próximos do vencimento