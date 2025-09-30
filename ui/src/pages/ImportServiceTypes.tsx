import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileText, Cog, Download, AlertCircle, CheckCircle, ArrowLeftIcon } from 'lucide-react';

import { ServiceTypesService } from '../services/serviceTypesService';

interface ServiceTypeImport {
  code: string;
  name: string;
  issRetained?: boolean;
  active?: boolean;
}

interface ImportResult {
  success: number;
  errors: string[];
  imported: any[];
}

const ImportServiceTypes: React.FC = () => {
  const [importData, setImportData] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<'json' | 'csv' | 'manual'>('manual');

  // Exemplo de dados para facilitar o teste
  const sampleData = [
    {
      code: "01.01",
      name: "Análise e desenvolvimento de sistemas",
      issRetained: false,
      active: true
    },
    {
      code: "01.02", 
      name: "Programação",
      issRetained: false,
      active: true
    },
    {
      code: "02.01",
      name: "Serviços de pesquisas e desenvolvimento",
      issRetained: true,
      active: true
    }
  ];

  const parseCSV = (csvText: string): ServiceTypeImport[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Skip header row (first line)
    const serviceTypes: ServiceTypeImport[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= 2) {
        serviceTypes.push({
          code: values[0] || '',
          name: values[1] || '',
          issRetained: values[2]?.toLowerCase() === 'true' || values[2]?.toLowerCase() === 'sim',
          active: values[3]?.toLowerCase() !== 'false' && values[3]?.toLowerCase() !== 'não' // Default true
        });
      }
    }

    return serviceTypes;
  };

  const parseJSON = (jsonText: string): ServiceTypeImport[] => {
    try {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      alert('Por favor, insira os dados para importação');
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      let serviceTypes: ServiceTypeImport[] = [];

      switch (importType) {
        case 'csv':
          serviceTypes = parseCSV(importData);
          break;
        case 'json':
          serviceTypes = parseJSON(importData);
          break;
        case 'manual':
          serviceTypes = parseJSON(importData);
          break;
      }

      if (serviceTypes.length === 0) {
        alert('Nenhum tipo de serviço válido encontrado nos dados');
        return;
      }

      // Processar importação
      console.log('🚀 [ImportServiceTypes] Iniciando importação em massa...');
      console.log('📊 [ImportServiceTypes] Total de tipos a importar:', serviceTypes.length);
      
      try {
        const result = await ServiceTypesService.importMany(serviceTypes.map(st => ({
          code: st.code,
          name: st.name,
          iss_retained: st.issRetained ?? false,
          active: st.active ?? true
        })));
        
        console.log('✅ [ImportServiceTypes] Importação concluída:', result.length, 'tipos criados');
        
        setImportResult({
          success: result.length,
          errors: [],
          imported: result
        });
      } catch (importError: any) {
        console.error('❌ [ImportServiceTypes] Erro na importação:', importError);
        setImportResult({
          success: 0,
          errors: [importError.message || 'Erro desconhecido na importação'],
          imported: []
        });
      }

    } catch (error) {
      console.error('Erro na importação:', error);
      alert('Erro ao processar importação: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const generateCSVTemplate = () => {
    const csvContent = 'codigo,nome,iss_retido,ativo\n' +
      '01.01,Análise e desenvolvimento de sistemas,false,true\n' +
      '01.02,Programação,false,true\n' +
      '02.01,Serviços de pesquisas,true,true';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo-tipos-servico.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadSampleData = () => {
    setImportData(JSON.stringify(sampleData, null, 2));
    setImportType('json');
  };

  const csvInstructions = [
    "Formato: codigo,nome,iss_retido,ativo",
    "Código: Código único do serviço (ex: 01.01)",
    "Nome: Nome descritivo do serviço",
    "ISS Retido: true/false ou sim/não",
    "Ativo: true/false ou sim/não (padrão: true)"
  ];

  const jsonInstructions = [
    "Array de objetos com propriedades:",
    "code (string): Código único do serviço",
    "name (string): Nome do serviço", 
    "issRetained (boolean, opcional): ISS retido na fonte",
    "active (boolean, opcional): Se o tipo está ativo (padrão: true)"
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              to="/service-types"
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Voltar para Tipos de Serviço
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Importar Tipos de Serviço</h1>
          <p className="mt-2 text-sm text-gray-600">
            Importe tipos de serviço em massa usando CSV ou JSON
          </p>
        </div>

        {/* Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold">Formato CSV</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              {csvInstructions.map((instruction, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {instruction}
                </li>
              ))}
            </ul>
            <button
              onClick={generateCSVTemplate}
              className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <Download className="h-4 w-4 mr-1" />
              Baixar modelo CSV
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center mb-4">
              <Cog className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold">Formato JSON</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              {jsonInstructions.map((instruction, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {instruction}
                </li>
              ))}
            </ul>
            <button
              onClick={loadSampleData}
              className="mt-4 flex items-center text-sm text-green-600 hover:text-green-800"
            >
              <Upload className="h-4 w-4 mr-1" />
              Carregar exemplo
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h3 className="text-lg font-semibold">Importante</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Códigos devem ser únicos</li>
              <li>• Nomes são obrigatórios</li>
              <li>• Dados duplicados serão ignorados</li>
              <li>• Verifique antes de importar</li>
              <li>• Backup seus dados existentes</li>
            </ul>
          </div>
        </div>

        {/* Import Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Dados para Importação</h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Format Selection */}
            <div>
              <label className="text-base font-medium text-gray-900">Formato dos dados</label>
              <div className="mt-4 space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
                <div className="flex items-center">
                  <input
                    id="format-json"
                    name="format"
                    type="radio"
                    checked={importType === 'json'}
                    onChange={() => setImportType('json')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="format-json" className="ml-3 text-sm font-medium text-gray-700">
                    JSON
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="format-csv"
                    name="format"
                    type="radio"
                    checked={importType === 'csv'}
                    onChange={() => setImportType('csv')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="format-csv" className="ml-3 text-sm font-medium text-gray-700">
                    CSV
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="format-manual"
                    name="format"
                    type="radio"
                    checked={importType === 'manual'}
                    onChange={() => setImportType('manual')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="format-manual" className="ml-3 text-sm font-medium text-gray-700">
                    Manual (JSON)
                  </label>
                </div>
              </div>
            </div>

            {/* Data Input */}
            <div>
              <label htmlFor="import-data" className="block text-sm font-medium text-gray-700 mb-2">
                {importType === 'csv' ? 'Dados CSV' : 'Dados JSON'}
              </label>
              <textarea
                id="import-data"
                rows={12}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                placeholder={
                  importType === 'csv'
                    ? 'codigo,nome,iss_retido,ativo\n01.01,Análise de sistemas,false,true'
                    : '[\n  {\n    "code": "01.01",\n    "name": "Análise de sistemas",\n    "issRetained": false,\n    "active": true\n  }\n]'
                }
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {importData.trim() && (
                  <>
                    {importType === 'csv' 
                      ? `${importData.split('\n').length - 1} linha(s) para processar`
                      : 'Dados JSON prontos para importação'
                    }
                  </>
                )}
              </div>
              
              <button
                onClick={handleImport}
                disabled={loading || !importData.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Tipos de Serviço
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {importResult && (
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Resultado da Importação</h3>
            </div>
            
            <div className="p-6">
              {/* Summary */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    {importResult.success} tipos importados com sucesso
                  </span>
                </div>
                
                {importResult.errors.length > 0 && (
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-red-800">
                      {importResult.errors.length} erro(s) encontrado(s)
                    </span>
                  </div>
                )}
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-red-800 mb-3">Erros encontrados:</h4>
                  <div className="bg-red-50 rounded-md p-4">
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Success */}
              {importResult.imported.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-800 mb-3">
                    Tipos de serviço importados com sucesso:
                  </h4>
                  <div className="bg-green-50 rounded-md p-4">
                    <ul className="text-sm text-green-700 space-y-1">
                      {importResult.imported.map((serviceType, index) => (
                        <li key={index}>
                          • {serviceType.code} - {serviceType.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex space-x-4">
                <Link
                  to="/service-types"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Ver Todos os Tipos de Serviço
                </Link>
                <button
                  onClick={() => {
                    setImportResult(null);
                    setImportData('');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Nova Importação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportServiceTypes;