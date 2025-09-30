import React, { useState } from 'react';
import { Upload, FileText, Building2, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { supplierService } from '../services/suppliers';
import api from '../services/api';

interface SupplierImport {
  name: string;
  document: string; // CNPJ
  email: string;
  phone: string;
}

interface ImportResult {
  success: number;
  errors: string[];
  suppliers: SupplierImport[];
}

const ImportSuppliers: React.FC = () => {
  const [importData, setImportData] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<'json' | 'csv' | 'manual'>('manual');

  // Exemplo de dados para facilitar o teste
  const sampleData = [
    {
      name: "ABC FORNECEDORA LTDA",
      document: "12.345.678/0001-90",
      email: "contato@abcfornecedora.com.br",
      phone: "(11) 98765-4321"
    },
    {
      name: "XYZ PRESTADORA DE SERVIÇOS LTDA",
      document: "98.765.432/0001-12", 
      email: "vendas@xyzprestadora.com.br",
      phone: "(11) 12345-6789"
    }
  ];

  const parseCSV = (csvText: string): SupplierImport[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Skip header row (first line)
    const suppliers: SupplierImport[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Parser mais robusto para CSV que lida com aspas e vírgulas dentro de campos
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          // Alternar estado de dentro/fora das aspas
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          // Vírgula fora das aspas = separador de campo
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          // Caractere normal, adicionar ao valor atual
          currentValue += char;
        }
      }
      
      // Adicionar o último valor
      if (currentValue || values.length > 0) {
        values.push(currentValue.trim());
      }

      // Só processar se tiver pelo menos nome e documento
      if (values.length >= 2 && values[0] && values[1]) {
        // Limpar CNPJ removendo caracteres especiais
        const cleanDocument = values[1].replace(/[^\d]/g, '');
        
        suppliers.push({
          name: values[0] || '',
          document: cleanDocument || values[1], // Use o limpo se possível, senão o original
          email: values[2] || '',
          phone: values[3] || ''
        });
      }
    }

    return suppliers;
  };

  const parseJSON = (jsonText: string): SupplierImport[] => {
    try {
      const data = JSON.parse(jsonText);
      return Array.isArray(data) ? data : [];
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
    const errors: string[] = [];
    let suppliers: SupplierImport[] = [];

    try {
      // Parse dos dados baseado no tipo
      if (importType === 'json') {
        suppliers = parseJSON(importData);
      } else if (importType === 'csv') {
        suppliers = parseCSV(importData);
      } else {
        // Manual - assumir que cada linha é um fornecedor simples
        const lines = importData.split('\n').filter(line => line.trim());
        suppliers = lines.map((line) => ({
          name: line.trim(),
          document: '',
          email: '',
          phone: ''
        }));
      }

      if (suppliers.length === 0) {
        throw new Error('Nenhum fornecedor válido encontrado nos dados');
      }

      // Importar para a API usando o service
      let success = 0;
      for (const supplier of suppliers) {
        try {
          // Converter document para cnpj para usar o supplierService
          const supplierData = {
            name: supplier.name,
            cnpj: supplier.document, // Converter document -> cnpj
            email: supplier.email,
            phone: supplier.phone
          };

          await supplierService.createSupplier(supplierData);
          success++;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
          errors.push(`${supplier.name}: ${errorMessage}`);
        }
      }

      setImportResult({
        success,
        errors,
        suppliers
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(`Erro geral: ${errorMessage}`);
      setImportResult({
        success: 0,
        errors,
        suppliers: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutomaticImport = async () => {
    setLoading(true);
    const errors: string[] = [];

    try {
      // Chamar o endpoint de extração automática de fornecedores do Uphold usando api service
      const response = await api.post('/api/extract-uphold-suppliers', {
        email: 'teste.alfa@teste.com',
        password: 'Teste@teste@teste123'
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Erro na extração: ${response.statusText}`);
      }

      const extractionResult = response.data;
      
      if (!extractionResult.success || !extractionResult.suppliers || extractionResult.suppliers.length === 0) {
        throw new Error('Nenhum fornecedor foi extraído do sistema Uphold');
      }

      // Importar os fornecedores extraídos usando o service
      let success = 0;
      const suppliers = extractionResult.suppliers;

      for (const supplier of suppliers) {
        try {
          // Converter document para cnpj para usar o supplierService
          const supplierData = {
            name: supplier.name,
            cnpj: supplier.document, // Converter document -> cnpj
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address
          };

          await supplierService.createSupplier(supplierData);
          success++;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
          errors.push(`${supplier.name}: ${errorMessage}`);
        }
      }

      setImportResult({
        success,
        errors,
        suppliers
      });

      // Mostrar os dados extraídos na área de texto para referência
      setImportData(JSON.stringify(suppliers, null, 2));
      setImportType('json');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(`Erro na extração automática: ${errorMessage}`);
      setImportResult({
        success: 0,
        errors,
        suppliers: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    setImportData(JSON.stringify(sampleData, null, 2));
    setImportType('json');
  };

  const downloadTemplate = (type: 'csv' | 'json') => {
    let content = '';
    let filename = '';
    
    if (type === 'csv') {
      content = 'Nome,CNPJ,Email,Telefone\n"ABC FORNECEDORA LTDA","12.345.678/0001-90","contato@abcfornecedora.com.br","(11) 98765-4321"\n"XYZ PRESTADORA DE SERVIÇOS LTDA","98.765.432/0001-12","vendas@xyzprestadora.com.br","(11) 12345-6789"';
      filename = 'template-fornecedores.csv';
    } else {
      content = JSON.stringify([{
        name: "ABC FORNECEDORA LTDA",
        document: "12.345.678/0001-90",
        email: "contato@abcfornecedora.com.br",
        phone: "(11) 98765-4321"
      }], null, 2);
      filename = 'template-fornecedores.json';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Importar Fornecedores</h1>
          </div>

          {/* Tipo de Importação */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Importação
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importType"
                  value="json"
                  checked={importType === 'json'}
                  onChange={(e) => setImportType(e.target.value as 'json')}
                  className="mr-2"
                />
                JSON
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importType"
                  value="csv"
                  checked={importType === 'csv'}
                  onChange={(e) => setImportType(e.target.value as 'csv')}
                  className="mr-2"
                />
                CSV
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importType"
                  value="manual"
                  checked={importType === 'manual'}
                  onChange={(e) => setImportType(e.target.value as 'manual')}
                  className="mr-2"
                />
                Manual (uma linha por fornecedor)
              </label>
            </div>
          </div>

          {/* Templates e Exemplos */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates e Exemplos
            </h3>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => downloadTemplate('json')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Template JSON
              </button>
              <button
                onClick={() => downloadTemplate('csv')}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Template CSV
              </button>
              <button
                onClick={loadSampleData}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Carregar Exemplo
              </button>
            </div>
          </div>

          {/* Importação Automática do Uphold */}
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-orange-800">
              <Upload className="h-5 w-5" />
              Importação Automática do Uphold
            </h3>
            <p className="text-sm text-orange-700 mb-3">
              Extrair fornecedores/tomadores automaticamente do sistema Uphold usando suas credenciais.
            </p>
            <button
              onClick={handleAutomaticImport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {loading ? 'Extraindo...' : 'Importar Fornecedores do Uphold'}
            </button>
          </div>

          {/* Área de Dados */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dados dos Fornecedores {importType === 'manual' && '(um nome por linha)'}
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={
                importType === 'json' 
                  ? '[\n  {\n    "name": "ABC FORNECEDORA LTDA",\n    "document": "12.345.678/0001-90",\n    "email": "contato@abc.com.br",\n    "phone": "(11) 98765-4321"\n  }\n]'
                  : importType === 'csv'
                  ? 'Nome,CNPJ,Email,Telefone\n"ABC FORNECEDORA LTDA","12.345.678/0001-90","contato@abc.com.br","(11) 98765-4321"'
                  : 'ABC FORNECEDORA LTDA\nXYZ PRESTADORA DE SERVIÇOS LTDA\nDEF COMÉRCIO LTDA'
              }
              className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm"
              disabled={loading}
            />
          </div>

          {/* Botão de Importação */}
          <button
            onClick={handleImport}
            disabled={loading || !importData.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Upload className="h-5 w-5" />
            )}
            {loading ? 'Importando...' : 'Importar Fornecedores'}
          </button>
        </div>

        {/* Resultado da Importação */}
        {importResult && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Resultado da Importação
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Sucessos</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Erros</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-800 mb-2">Erros encontrados:</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  {importResult.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.success > 0 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => window.location.href = '/suppliers'}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Ver Fornecedores Importados
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportSuppliers;