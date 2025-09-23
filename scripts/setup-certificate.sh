#!/bin/bash

# 🔐 Script de Configuração do Certificado PFX
# Para usar o certificado UPHOLD CONTABILIDADE.pfx no sistema NFSe

echo "🔐 Configuração do Certificado PFX para NFSe"
echo "============================================="

# Definir caminhos
PFX_SOURCE="/Users/alfanet/Downloads/UPHOLD CONTABILIDADE.pfx"
PROJECT_DIR="/Users/alfanet/StudioProjects/git/emissao-de-nota-automatica"
CERT_DIR="${PROJECT_DIR}/certs"
PFX_DEST="${CERT_DIR}/certificate.pfx"

# Verificar se o arquivo existe
if [ ! -f "$PFX_SOURCE" ]; then
    echo "❌ Arquivo PFX não encontrado: $PFX_SOURCE"
    exit 1
fi

echo "✅ Certificado encontrado: $PFX_SOURCE"
echo "📁 Tamanho: $(ls -lh "$PFX_SOURCE" | awk '{print $5}')"

# Criar diretório de certificados
mkdir -p "$CERT_DIR"
echo "📁 Diretório criado: $CERT_DIR"

# Copiar certificado
cp "$PFX_SOURCE" "$PFX_DEST"
echo "✅ Certificado copiado para: $PFX_DEST"

# Definir permissões seguras
chmod 600 "$PFX_DEST"
echo "🔒 Permissões de segurança aplicadas"

# Criar arquivo de configuração
cat > "${CERT_DIR}/cert-config.json" << EOF
{
  "pfxPath": "${PFX_DEST}",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "originalName": "UPHOLD CONTABILIDADE.pfx",
  "size": $(stat -f%z "$PFX_SOURCE")
}
EOF
echo "✅ Configuração salva: ${CERT_DIR}/cert-config.json"

# Criar arquivo .env para certificado
cat > "${PROJECT_DIR}/.env.certificate" << EOF
# Configuração do Certificado NFSe
CERTIFICATE_PATH=${PFX_DEST}
# CERTIFICATE_PASSWORD=<será solicitada em runtime para segurança>
CERTIFICATE_ENABLED=true
CERTIFICATE_NAME=UPHOLD_CONTABILIDADE
EOF
echo "✅ Arquivo .env criado: ${PROJECT_DIR}/.env.certificate"

echo ""
echo "🎉 Certificado configurado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. 🔑 A senha será solicitada quando necessário"
echo "2. 🔧 O certificado está pronto para uso na API"
echo "3. 🧪 Execute o teste de assinatura para validar"
echo ""
echo "📂 Arquivos criados:"
echo "   - $PFX_DEST"
echo "   - ${CERT_DIR}/cert-config.json"
echo "   - ${PROJECT_DIR}/.env.certificate"