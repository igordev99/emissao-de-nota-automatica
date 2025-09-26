#!/bin/bash

# Script para configurar environment variables no Vercel
# Execute: chmod +x setup-vercel.sh && ./setup-vercel.sh

echo "🚀 Configurando environment variables no Vercel..."

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instale com: npm i -g vercel"
    exit 1
fi

# Login no Vercel se necessário
echo "Verificando autenticação do Vercel..."
vercel whoami > /dev/null 2>&1 || {
    echo "Faça login no Vercel primeiro:"
    vercel login
}

PROJECT_NAME="emissao-de-nota-automatica"

echo "📝 Configurando variáveis de ambiente para o projeto $PROJECT_NAME..."

# Variáveis obrigatórias
echo "🔐 Configurando variáveis de segurança..."
vercel env add JWT_SECRET production --value "$(openssl rand -base64 32)"
vercel env add RETRY_WEBHOOK_TOKEN production --value "$(openssl rand -base64 32)"

# Database URL do Supabase
echo "🗄️  Configure a DATABASE_URL do Supabase:"
echo "Exemplo: postgresql://postgres:PASSWORD@PROJECT_REF.supabase.co:5432/postgres?schema=public&sslmode=require"
read -p "Digite sua DATABASE_URL: " database_url
vercel env add DATABASE_URL production --value "$database_url"

# Supabase configurações opcionais
read -p "Digite sua SUPABASE_URL (opcional): " supabase_url
if [ ! -z "$supabase_url" ]; then
    vercel env add SUPABASE_URL production --value "$supabase_url"
fi

read -p "Digite sua SUPABASE_SERVICE_ROLE_KEY (opcional): " supabase_key
if [ ! -z "$supabase_key" ]; then
    vercel env add SUPABASE_SERVICE_ROLE_KEY production --value "$supabase_key"
fi

# Configurações da aplicação
vercel env add NODE_ENV production --value "production"
vercel env add METRICS_ENABLED production --value "1"
vercel env add LOG_LEVEL production --value "info"
vercel env add LOG_PRETTY production --value "0"

# Health checks
vercel env add HEALTH_MAX_EVENT_LOOP_LAG_MS production --value "500"
vercel env add HEALTH_MAX_HEAP_USED_BYTES production --value "512000000"
vercel env add HEALTH_MAX_RSS_BYTES production --value "1073741824"
vercel env add HEALTH_DB_TIMEOUT_MS production --value "3000"

# CORS
read -p "Digite os domínios permitidos para CORS (separados por vírgula): " allowed_origins
if [ ! -z "$allowed_origins" ]; then
    vercel env add ALLOWED_ORIGINS production --value "$allowed_origins"
fi

# Agent externo (opcional)
read -p "Digite a URL do agente externo (opcional): " agent_url
if [ ! -z "$agent_url" ]; then
    vercel env add AGENT_BASE_URL production --value "$agent_url"
fi

# Certificado A1 (opcional)
read -p "Digite o caminho do certificado PFX (opcional): " cert_path
if [ ! -z "$cert_path" ]; then
    vercel env add CERT_PFX_PATH production --value "$cert_path"
    read -p "Digite a senha do certificado: " -s cert_password
    echo
    vercel env add CERT_PFX_PASSWORD production --value "$cert_password"
fi

echo "✅ Configuração concluída!"
echo "🔧 Execute 'vercel --prod' para fazer o deploy"
echo "📊 Acesse https://vercel.com/dashboard para gerenciar suas variáveis"