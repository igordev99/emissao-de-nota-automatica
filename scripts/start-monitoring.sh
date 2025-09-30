#!/bin/bash
# Script para inicializar Grafana e Prometheus localmente

echo "🚀 Iniciando Sistema de Monitoramento NFSe..."
echo ""

# Verificar se docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Verificar se docker-compose está disponível
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose não encontrado. Instale primeiro."
    exit 1
fi

echo "📊 Subindo Grafana e Prometheus..."
docker-compose -f docker-compose.observability.yml up -d

echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

echo ""
echo "🎉 Sistema de Monitoramento Iniciado!"
echo ""
echo "📊 URLs Disponíveis:"
echo "   Grafana:    http://localhost:3001"
echo "   Prometheus: http://localhost:9090"
echo ""
echo "🔐 Credenciais Grafana:"
echo "   Usuário: admin"
echo "   Senha:   admin"
echo ""
echo "📈 Dashboards:"
echo "   - NFSe Metrics"
echo "   - System Health"
echo "   - API Performance"
echo "   - Jobs Monitoring"
echo ""
echo "🛑 Para parar:"
echo "   docker-compose -f docker-compose.observability.yml down"