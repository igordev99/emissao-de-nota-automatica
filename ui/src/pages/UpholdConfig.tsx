import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Download, 
  RefreshCw, 
  Database, 
  Users,
  Calculator,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Building2
} from 'lucide-react';

interface ServiceType {
  id: number;
  code: string;
  name: string;
  issRetido: boolean;
}

interface MonthlyClosures {
  id: number;
  cnpj: string;
  prestador: string;
  mes: string;
  qtdEmissoes: string;
  valorEmissoes: string;
  valorFatExterno: string;
  valorTotalMes: string;
  aliquotaMes: string;
}

interface Administrator {
  id: number;
  name: string;
  email: string;
}

interface Formula {
  valMin: any[];
  valMax: any[];
  indice: any[];
  fatorRedutor: any[];
  issRetidoDAS: any[];
}

const UpholdConfig: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'formulas' | 'closures' | 'admins'>('overview');
  
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [monthlyClosures, setMonthlyClosures] = useState<MonthlyClosures[]>([]);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [formulas, setFormulas] = useState<Formula | null>(null);
  
  const [extractionStatus, setExtractionStatus] = useState<{
    lastExtraction?: string;
    totalServices?: number;
    totalClosures?: number;
    totalAdmins?: number;
  }>({});

  // Executar extração completa dos módulos
  const handleFullExtraction = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/extract-uphold-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'teste.alfa@teste.com',
          password: 'Teste@teste@teste123'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Extração completa realizada:', data);
        
        // Recarregar dados dos endpoints específicos
        await loadAllData();
        
        setExtractionStatus({
          lastExtraction: new Date().toISOString(),
          totalServices: serviceTypes.length,
          totalClosures: monthlyClosures.length,
          totalAdmins: administrators.length
        });

        alert('Extração completa realizada com sucesso!');
      } else {
        const error = await response.json();
        alert(`Erro na extração: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro durante a extração');
    }
    setLoading(false);
  };

  // Extrair apenas fórmulas
  const handleFormulasExtraction = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/extract-formulas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'teste.alfa@teste.com',
          password: 'Teste@teste@teste123'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormulas(data.formulas);
        alert('Fórmulas extraídas com sucesso!');
      } else {
        const error = await response.json();
        alert(`Erro na extração de fórmulas: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro durante a extração de fórmulas');
    }
    setLoading(false);
  };

  // Carregar todos os dados dos endpoints
  const loadAllData = async () => {
    try {
      // Carregar tipos de serviço
      const servicesResponse = await fetch('/api/service-types');
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        setServiceTypes(servicesData.serviceTypes || []);
      }

      // Carregar fechamentos mensais
      const closuresResponse = await fetch('/api/monthly-closures');
      if (closuresResponse.ok) {
        const closuresData = await closuresResponse.json();
        setMonthlyClosures(closuresData.closures || []);
      }

      // Carregar administradores
      const adminsResponse = await fetch('/api/administrators');
      if (adminsResponse.ok) {
        const adminsData = await adminsResponse.json();
        setAdministrators(adminsData.administrators || []);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const exportToCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const TabButton: React.FC<{ 
    id: typeof activeTab; 
    icon: React.ReactNode; 
    label: string; 
    count?: number 
  }> = ({ id, icon, label, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        activeTab === id 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-1 text-xs rounded-full ${
          activeTab === id ? 'bg-blue-800' : 'bg-gray-300'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Configurações Uphold</h1>
                <p className="opacity-90">Gestão de configurações extraídas do sistema Uphold</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleFormulasExtraction}
                disabled={loading}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Calculator className="h-4 w-4" />
                <span>Extrair Fórmulas</span>
              </button>
              
              <button
                onClick={handleFullExtraction}
                disabled={loading}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span>Extração Completa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="p-6 border-b">
          <div className="flex space-x-2 overflow-x-auto">
            <TabButton
              id="overview"
              icon={<Database className="h-4 w-4" />}
              label="Visão Geral"
            />
            <TabButton
              id="services"
              icon={<Building2 className="h-4 w-4" />}
              label="Tipos de Serviço"
              count={serviceTypes.length}
            />
            <TabButton
              id="formulas"
              icon={<Calculator className="h-4 w-4" />}
              label="Fórmulas"
            />
            <TabButton
              id="closures"
              icon={<TrendingUp className="h-4 w-4" />}
              label="Fechamento Mensal"
              count={monthlyClosures.length}
            />
            <TabButton
              id="admins"
              icon={<Users className="h-4 w-4" />}
              label="Administradores"
              count={administrators.length}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800">Resumo das Configurações</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Tipos de Serviço</p>
                      <p className="text-2xl font-bold text-blue-800">{serviceTypes.length}</p>
                    </div>
                    <Building2 className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Fechamentos</p>
                      <p className="text-2xl font-bold text-green-800">{monthlyClosures.length}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Administradores</p>
                      <p className="text-2xl font-bold text-purple-800">{administrators.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Fórmulas</p>
                      <p className="text-2xl font-bold text-orange-800">
                        {formulas ? Object.keys(formulas).length : 0}
                      </p>
                    </div>
                    <Calculator className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </div>

              {extractionStatus.lastExtraction && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="text-sm text-gray-600">
                      Última extração: {new Date(extractionStatus.lastExtraction).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Service Types Tab */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Tipos de Serviço ({serviceTypes.length})</h2>
                <button
                  onClick={() => exportToCsv(serviceTypes, 'tipos-servico.csv')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Código</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome do Serviço</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ISS Retido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {serviceTypes.slice(0, 20).map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">{service.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{service.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            service.issRetido 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {service.issRetido ? 'Sim' : 'Não'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {serviceTypes.length > 20 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Mostrando 20 de {serviceTypes.length} tipos de serviço
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Formulas Tab */}
          {activeTab === 'formulas' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Fórmulas de Cálculo</h2>
              
              {formulas ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(formulas).map(([key, values]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="font-medium text-gray-800 mb-2 capitalize">{key}</h3>
                      <div className="space-y-1">
                        {values.slice(0, 5).map((item: any, index: number) => (
                          <div key={index} className="text-sm text-gray-600">
                            <span className="font-mono bg-white px-2 py-1 rounded">
                              {item.value || 'N/A'}
                            </span>
                          </div>
                        ))}
                        {values.length > 5 && (
                          <p className="text-xs text-gray-500">+ {values.length - 5} mais valores</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma fórmula extraída ainda.</p>
                  <p className="text-sm text-gray-500 mb-4">Clique em "Extrair Fórmulas" para obter os dados.</p>
                  <button
                    onClick={handleFormulasExtraction}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Extrair Fórmulas Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Monthly Closures Tab */}
          {activeTab === 'closures' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Fechamento Mensal ({monthlyClosures.length})</h2>
                <button
                  onClick={() => exportToCsv(monthlyClosures, 'fechamento-mensal.csv')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">CNPJ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Prestador</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Mês</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Qtd. Emissões</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Valor Total</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Alíquota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {monthlyClosures.slice(0, 15).map((closure) => (
                      <tr key={closure.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">{closure.cnpj}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{closure.prestador}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{closure.mes}</td>
                        <td className="px-4 py-3 text-sm text-center">{closure.qtdEmissoes}</td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">{closure.valorTotalMes}</td>
                        <td className="px-4 py-3 text-sm text-purple-600">{closure.aliquotaMes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {monthlyClosures.length > 15 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Mostrando 15 de {monthlyClosures.length} fechamentos
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Administrators Tab */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Administradores ({administrators.length})</h2>
                <button
                  onClick={() => exportToCsv(administrators, 'administradores.csv')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {administrators.map((admin) => (
                  <div key={admin.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{admin.name}</p>
                        <p className="text-sm text-gray-500 truncate">{admin.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default UpholdConfig;