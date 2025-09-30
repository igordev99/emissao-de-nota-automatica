# 🔐 Guia de Configuração do Certificado NFSe - UPHOLD CONTABILIDADE

## 📋 **Status Atual:**

✅ **Certificado instalado e configurado com sucesso!**

### **📂 Arquivos criados:**
```
/Users/alfanet/StudioProjects/git/emissao-de-nota-automatica/
├── certs/
│   ├── certificate.pfx           # Certificado UPHOLD CONTABILIDADE  
│   ├── cert-config.json         # Configurações do certificado
│   └── cert-details.json        # Detalhes extraídos (após teste)
├── .env.certificate             # Variáveis de ambiente
└── scripts/
    ├── setup-certificate.sh     # Script de configuração ✅
    ├── test-certificate.js      # Teste detalhado do certificado
    └── test-api-certificate.js  # Teste de integração com API
```

---

## 🚀 **Como Usar o Certificado:**

### **1. 🧪 Testar o Certificado (Primeira vez):**
```bash
cd /Users/alfanet/StudioProjects/git/emissao-de-nota-automatica
node scripts/test-certificate.js
# Digite a senha quando solicitado
```

**Saída esperada:**
- ✅ Informações do titular (UPHOLD CONTABILIDADE)
- ✅ Validade do certificado
- ✅ Acesso à chave privada
- ✅ Arquivo de detalhes salvo

### **2. 🔧 Testar Integração com API:**
```bash
node scripts/test-api-certificate.js
# Digite a senha quando solicitado
```

**Saída esperada:**
- ✅ Certificado detectado
- ✅ Carregamento com senha
- ✅ Componentes de assinatura disponíveis

### **3. 🔄 Usar em Desenvolvimento Local:**
```bash
# Configurar senha temporariamente
export CERTIFICATE_PASSWORD="SUA_SENHA_AQUI"

# Executar API local
npm start
# ou
node api/nfse-working.mjs
```

### **4. 🌐 Configurar para Produção (Vercel):**
```bash
# Converter certificado para base64
base64 -i certs/certificate.pfx -o cert-base64.txt

# Configurar no Vercel
vercel env add CERT_PFX_BASE64
# Cole o conteúdo do arquivo cert-base64.txt

vercel env add CERT_PFX_PASSWORD
# Digite a senha do certificado

vercel env add CERTIFICATE_ENABLED
# Digite: false (usar base64 em produção)
```

---

## 📊 **Configurações de Ambiente:**

### **📁 Arquivo `.env.certificate`:**
```bash
CERTIFICATE_PATH=/path/to/certificate.pfx
CERTIFICATE_ENABLED=true              # true = usar arquivo local
CERTIFICATE_NAME=UPHOLD_CONTABILIDADE
# CERTIFICATE_PASSWORD=<runtime>      # Será solicitada quando necessário
```

### **🌐 Variáveis de Produção (Vercel):**
```bash
CERT_PFX_BASE64=<certificado_em_base64>
CERT_PFX_PASSWORD=<senha_do_certificado>
CERTIFICATE_ENABLED=false             # false = usar base64
```

---

## 🔄 **Fluxo de Uso:**

### **Desenvolvimento Local:**
1. **Certificado arquivo PFX** → Senha digitada → **API funcional**

### **Produção (Vercel):**
1. **Certificado base64** → Senha env var → **API serverless**

---

## 🛠️ **Comandos Úteis:**

### **Verificar informações do certificado:**
```bash
openssl pkcs12 -info -in certs/certificate.pfx -nokeys -noout
```

### **Extrair certificado público:**
```bash
openssl pkcs12 -in certs/certificate.pfx -clcerts -nokeys -out cert.pem
```

### **Extrair chave privada:**
```bash
openssl pkcs12 -in certs/certificate.pfx -nocerts -nodes -out private-key.pem
```

### **Converter para base64 (produção):**
```bash
base64 -i certs/certificate.pfx
```

---

## 🧪 **Testando Assinatura de NFSe:**

### **1. Teste via API Health:**
```bash
curl http://localhost:3000/health
# Deve mostrar certificate: valid
```

### **2. Teste via API de emissão:**
```bash
curl -X POST http://localhost:3000/api/nfse/emit \
  -H "Content-Type: application/json" \
  -d @examples/emit.json
```

### **3. Verificar assinatura no XML:**
```bash
# O XML gerado deve conter:
# <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
#   <SignedInfo>
#     <CanonicalizationMethod Algorithm="..."/>
#     <SignatureMethod Algorithm="..."/>
#   </SignedInfo>
#   <SignatureValue>...</SignatureValue>
#   <KeyInfo>
#     <X509Data>
#       <X509Certificate>...</X509Certificate>
#     </X509Data>
#   </KeyInfo>
# </Signature>
```

---

## ⚠️ **Segurança:**

### **✅ Boas Práticas Implementadas:**
- 🔒 Certificado com permissões `600` (apenas owner)
- 🚫 Senha não salva em arquivos
- 💾 Cache temporário apenas em memória
- 📁 Pasta `certs/` deve ser ignorada no git

### **🔐 Adicionar ao .gitignore:**
```bash
echo "certs/" >> .gitignore
echo ".env.certificate" >> .gitignore
```

---

## 🎯 **Próximos Passos:**

### **✅ Já Implementado:**
1. ✅ Certificado instalado
2. ✅ Scripts de teste criados
3. ✅ Integração com API preparada
4. ✅ Suporte para desenvolvimento e produção

### **🔄 Para Fazer:**
1. 🧪 **Executar testes** (`node scripts/test-certificate.js`)
2. 🔄 **Testar API** (`node scripts/test-api-certificate.js`)
3. 🚀 **Emitir NFSe de teste** com certificado real
4. 🌐 **Configurar produção** no Vercel com base64

---

## 📞 **Solução de Problemas:**

### **❌ "Certificate file not found":**
- Verificar se o arquivo existe: `ls -la certs/certificate.pfx`
- Executar novamente: `./scripts/setup-certificate.sh`

### **❌ "Invalid password":**
- Verificar senha digitada
- Testar com OpenSSL: `openssl pkcs12 -info -in certs/certificate.pfx`

### **❌ "Permission denied":**
- Corrigir permissões: `chmod 600 certs/certificate.pfx`

---

## 🎉 **Certificado Pronto para Uso!**

**✅ O certificado UPHOLD CONTABILIDADE está configurado e pronto para assinar NFSe!**

**🚀 Execute os testes para validar e depois comece a emitir notas fiscais reais!**