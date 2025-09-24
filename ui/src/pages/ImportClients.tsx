import React, { useState } from 'react';
import { Upload, FileText, Users, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface ClienteImport {
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  endereco: string;
}

interface ImportResult {
  success: number;
  errors: string[];
  clients: ClienteImport[];
}

const ImportClients: React.FC = () => {
  const [importData, setImportData] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<'json' | 'csv' | 'manual'>('manual');

  // Exemplo de dados para facilitar o teste
  const sampleData = [
    {
      nome: "João Silva",
      email: "joao@email.com",
      telefone: "(11) 99999-1111",
      documento: "123.456.789-00",
      endereco: "Rua A, 123 - São Paulo/SP"
    },
    {
      nome: "Maria Santos",
      email: "maria@email.com", 
      telefone: "(11) 99999-2222",
      documento: "987.654.321-00",
      endereco: "Rua B, 456 - São Paulo/SP"
    }
  ];

  const parseCSV = (csvText: string): ClienteImport[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Skip header row (first line)
    const clients: ClienteImport[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= 2) {
        clients.push({
          nome: values[0] || '',
          email: values[1] || '',
          telefone: values[2] || '',
          documento: values[3] || '',
          endereco: values[4] || ''
        });
      }
    }

    return clients;
  };

  const parseJSON = (jsonText: string): ClienteImport[] => {
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
    let clients: ClienteImport[] = [];

    try {
      // Parse dos dados baseado no tipo
      if (importType === 'json') {
        clients = parseJSON(importData);
      } else if (importType === 'csv') {
        clients = parseCSV(importData);
      } else {
        // Manual - assumir que cada linha é um cliente simples
        const lines = importData.split('\n').filter(line => line.trim());
        clients = lines.map((line) => ({
          nome: line.trim(),
          email: '',
          telefone: '',
          documento: '',
          endereco: ''
        }));
      }

      if (clients.length === 0) {
        throw new Error('Nenhum cliente válido encontrado nos dados');
      }

      // Importar para a API
      let success = 0;
      for (const client of clients) {
        try {
          const response = await fetch('/api/clients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(client)
          });

          if (response.ok) {
            success++;
          } else {
            const errorText = await response.text();
            errors.push(`${client.nome}: ${errorText}`);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          errors.push(`${client.nome}: Erro de rede - ${errorMessage}`);
        }
      }

      setImportResult({
        success,
        errors,
        clients
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(`Erro geral: ${errorMessage}`);
      setImportResult({
        success: 0,
        errors,
        clients: []
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
      content = 'Nome,Email,Telefone,Documento,Endereco\n"João Silva","joao@email.com","(11) 99999-1111","123.456.789-00","Rua A, 123"';
      filename = 'template-clientes.csv';
    } else {
      content = JSON.stringify([{
        nome: "João Silva",
        email: "joao@email.com",
        telefone: "(11) 99999-1111",
        documento: "123.456.789-00",
        endereco: "Rua A, 123 - São Paulo/SP"
      }], null, 2);
      filename = 'template-clientes.json';
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
            <h1 className="text-2xl font-bold text-gray-800">Importar Clientes</h1>
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
                Manual (uma linha por cliente)
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
                <Users className="h-4 w-4" />
                Carregar Exemplo
              </button>
            </div>
          </div>

          {/* Área de Dados */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dados dos Clientes {importType === 'manual' && '(um nome por linha)'}
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={
                importType === 'json' 
                  ? '[\n  {\n    "nome": "João Silva",\n    "email": "joao@email.com",\n    ...\n  }\n]'
                  : importType === 'csv'
                  ? 'Nome,Email,Telefone,Documento,Endereco\n"João Silva","joao@email.com",...'
                  : 'João Silva\nMaria Santos\nPedro Costa'
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
            {loading ? 'Importando...' : 'Importar Clientes'}
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
                  onClick={() => window.location.href = '/clients'}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Ver Clientes Importados
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportClients;