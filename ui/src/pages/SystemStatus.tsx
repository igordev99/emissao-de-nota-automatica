import { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'checking' | 'online' | 'offline' | 'error';
  responseTime?: number;
  lastCheck?: string;
  data?: any;
}

export default function SystemStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'API Health',
      url: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/health',
      status: 'checking'
    },
    {
      name: 'Certificado Digital',
      url: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/health/cert',
      status: 'checking'
    },
    {
      name: 'Dependencies Check',
      url: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/health/deps',
      status: 'checking'
    }
  ]);

  const checkService = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(service.url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      return {
        ...service,
        status: response.ok ? 'online' : 'error',
        responseTime,
        lastCheck: new Date().toLocaleTimeString(),
        data
      };
    } catch (error) {
      return {
        ...service,
        status: 'offline',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toLocaleTimeString(),
        data: { error: (error as Error).message }
      };
    }
  };

  const checkAllServices = async () => {
    setServices(prev => prev.map(s => ({ ...s, status: 'checking' })));
    
    const updatedServices = await Promise.all(
      services.map(service => checkService(service))
    );
    
    setServices(updatedServices);
  };

  useEffect(() => {
    checkAllServices();
  }, []);

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'offline':
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-50 border-green-200';
      case 'offline':
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'checking':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const apiEndpoints = [
    {
      name: 'Health Check',
      url: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/health',
      description: 'Status geral da API'
    },
    {
      name: 'Certificado Digital',
      url: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/health/cert',
      description: 'Status do certificado PFX'
    },
    {
      name: 'Dependências',
      url: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/health/deps',
      description: 'Status do banco e certificado'
    },
    {
      name: 'API Base',
      url: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app',
      description: 'URL base da API backend'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Server className="h-6 w-6 text-blue-600" />
          Status do Sistema
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitoramento em tempo real dos serviços da aplicação
        </p>
      </div>

      {/* Botão de Atualizar */}
      <div className="mb-6">
        <button
          onClick={checkAllServices}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Status
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {services.map((service, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getStatusColor(service.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">{service.name}</h3>
              {getStatusIcon(service.status)}
            </div>
            
            <div className="space-y-1 text-xs text-gray-600">
              {service.responseTime && (
                <p>Tempo: {service.responseTime}ms</p>
              )}
              {service.lastCheck && (
                <p>Última verificação: {service.lastCheck}</p>
              )}
              {service.data && service.status === 'online' && (
                <div className="mt-2">
                  {service.name === 'Certificado Digital' && service.data.loaded && (
                    <div>
                      <p className="text-green-600">✓ Certificado carregado</p>
                      <p>Validade: {service.data.daysToExpire} dias</p>
                    </div>
                  )}
                  {service.name === 'API Health' && (
                    <p className="text-green-600">✓ API Online</p>
                  )}
                </div>
              )}
              {service.data?.error && (
                <p className="text-red-600 text-xs">{service.data.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* URLs dos Endpoints */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Endpoints da API
          </h3>
          <div className="space-y-4">
            {apiEndpoints.map((endpoint, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{endpoint.name}</h4>
                  <p className="text-xs text-gray-500">{endpoint.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border font-mono text-gray-600">
                    {endpoint.url}
                  </code>
                  <a
                    href={endpoint.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Informações Importantes */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Informações Importantes
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Frontend:</strong> https://emissao-de-nota-automatica.vercel.app</p>
          <p><strong>Backend API:</strong> https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app</p>
          <p><strong>Nota:</strong> O frontend e backend estão em projetos separados no Vercel</p>
          <p><strong>Certificado:</strong> Configurado via variáveis de ambiente (CERT_PFX_BASE64)</p>
          <p><strong>CORS:</strong> Configurado para permitir acesso do frontend ao backend</p>
        </div>
      </div>

      {/* Guia Rápido */}
      <div className="mt-6 bg-green-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-green-900 mb-3 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Como Testar os Endpoints
        </h3>
        <div className="text-sm text-green-800 space-y-2">
          <p><strong>1. Health Check:</strong> Clique nos links acima ou use curl</p>
          <p><strong>2. Certificado:</strong> Verifique se retorna "loaded": true</p>
          <p><strong>3. Frontend:</strong> Teste o login e navegação no sistema</p>
          <p><strong>4. API:</strong> Use as ferramentas de desenvolvedor do browser para ver as requisições</p>
        </div>
      </div>
    </div>
  );
}