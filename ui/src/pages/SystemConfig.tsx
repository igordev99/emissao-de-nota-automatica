import { useState } from 'react';
import { 
  Settings, 
  Shield, 
  Server, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  ExternalLink,
  Copy,
  Download
} from 'lucide-react';

interface ConfigSection {
  title: string;
  status: 'ok' | 'warning' | 'error' | 'info';
  description: string;
  items: ConfigItem[];
}

interface ConfigItem {
  label: string;
  value: string;
  type: 'text' | 'code' | 'link' | 'file';
  copyable?: boolean;
}

export default function SystemConfig() {
  const [activeTab, setActiveTab] = useState<'requirements' | 'certificate' | 'prefeitura' | 'api'>('requirements');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const downloadCertificateGuide = () => {
    const guide = `
# 🔐 Guia de Configuração do Certificado NFSe

## 1. Preparação do Certificado
- Arquivo: UPHOLD CONTABILIDADE.pfx
- Senha: [inserir senha do certificado]

## 2. Conversão para Base64
\`\`\`bash
# No Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("caminho/para/UPHOLD CONTABILIDADE.pfx"))

# No Linux/Mac:
base64 -i "UPHOLD CONTABILIDADE.pfx" -o certificado.txt
\`\`\`

## 3. Configuração no Vercel
1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto: emissao-de-nota-automatica
3. Vá em Settings > Environment Variables
4. Adicione:
   - CERT_PFX_BASE64: [resultado do base64]
   - CERT_PFX_PASSWORD: [senha do certificado]

## 4. Teste da Configuração
\`\`\`bash
curl https://sua-api.vercel.app/health/cert
\`\`\`

## 5. Resultado Esperado
\`\`\`json
{
  "loaded": true,
  "status": "valid",
  "thumbprint": "...",
  "hasPrivateKey": true,
  "notBefore": "2024-01-01T00:00:00.000Z",
  "notAfter": "2025-12-31T23:59:59.000Z",
  "daysToExpire": 365
}
\`\`\`
`;

    const blob = new Blob([guide], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guia-certificado-nfse.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sections: Record<string, ConfigSection[]> = {
    requirements: [
      {
        title: 'Requisitos para Emissão de NFS-e',
        status: 'info',
        description: 'Documentos e configurações necessárias',
        items: [
          { label: 'Certificado Digital A1', value: 'UPHOLD CONTABILIDADE.pfx', type: 'file' },
          { label: 'Senha do Certificado', value: '[configurada no ambiente]', type: 'text' },
          { label: 'Inscrição Municipal', value: 'Necessária para SP', type: 'text' },
          { label: 'CNAE Principal', value: 'Código de atividade econômica', type: 'text' },
          { label: 'Dados do Tomador', value: 'CPF/CNPJ, nome, endereço', type: 'text' }
        ]
      },
      {
        title: 'Dados Obrigatórios da Nota',
        status: 'warning',
        description: 'Campos que devem ser preenchidos corretamente',
        items: [
          { label: 'Descrição do Serviço', value: 'Detalhada e clara', type: 'text' },
          { label: 'Valor do Serviço', value: 'R$ 0,00 (mínimo)', type: 'text' },
          { label: 'Alíquota ISS', value: 'Conforme código de serviço', type: 'text' },
          { label: 'Local da Prestação', value: 'Endereço onde foi prestado', type: 'text' },
          { label: 'Data de Competência', value: 'Quando o serviço foi realizado', type: 'text' }
        ]
      }
    ],
    certificate: [
      {
        title: 'Configuração do Certificado Digital',
        status: 'warning',
        description: 'Passos para configurar o certificado UPHOLD CONTABILIDADE.pfx',
        items: [
          { 
            label: 'Converter para Base64', 
            value: '[Convert]::ToBase64String([IO.File]::ReadAllBytes("UPHOLD CONTABILIDADE.pfx"))', 
            type: 'code',
            copyable: true 
          },
          { 
            label: 'Variável CERT_PFX_BASE64', 
            value: 'Colar resultado do comando acima', 
            type: 'text' 
          },
          { 
            label: 'Variável CERT_PFX_PASSWORD', 
            value: 'Senha do certificado PFX', 
            type: 'text' 
          },
          { 
            label: 'Teste da Configuração', 
            value: 'https://emissao-de-nota-automatica.vercel.app/health/cert', 
            type: 'link' 
          }
        ]
      },
      {
        title: 'Validade e Renovação',
        status: 'info', 
        description: 'Monitoramento da validade do certificado',
        items: [
          { label: 'Verificar Validade', value: 'Certificado deve estar dentro da validade', type: 'text' },
          { label: 'Renovação', value: 'Renovar 30 dias antes do vencimento', type: 'text' },
          { label: 'Backup', value: 'Manter backup seguro do arquivo .pfx', type: 'text' },
          { label: 'Teste Mensal', value: 'Verificar funcionamento regularmente', type: 'text' }
        ]
      }
    ],
    prefeitura: [
      {
        title: 'Configurações da Prefeitura de SP',
        status: 'info',
        description: 'Ajustes necessários no portal da prefeitura',
        items: [
          { 
            label: 'Portal NFSe SP', 
            value: 'https://nfe.prefeitura.sp.gov.br', 
            type: 'link' 
          },
          { label: 'Cadastro de Contribuinte', value: 'Inscrição municipal ativa', type: 'text' },
          { label: 'Certificado Instalado', value: 'Mesmo certificado usado na API', type: 'text' },
          { label: 'Regime de Tributação', value: 'Configurado corretamente (Simples, etc)', type: 'text' }
        ]
      },
      {
        title: 'Códigos de Serviço',
        status: 'warning',
        description: 'Configuração dos códigos de atividade',
        items: [
          { label: 'Lista de Códigos', value: 'Consultar tabela oficial da prefeitura', type: 'text' },
          { label: 'CNAE x Código Serviço', value: 'Relacionamento correto é obrigatório', type: 'text' },
          { label: 'Alíquota ISS', value: 'Varia conforme código (2% a 5%)', type: 'text' },
          { label: 'Local de Tributação', value: 'SP ou outro município', type: 'text' }
        ]
      }
    ],
    api: [
      {
        title: 'Configuração da API',
        status: 'ok',
        description: 'Endpoints e configurações do sistema',
        items: [
          { 
            label: 'URL Principal (Frontend)', 
            value: 'https://emissao-de-nota-automatica.vercel.app', 
            type: 'link' 
          },
          { 
            label: 'API Backend', 
            value: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app', 
            type: 'link' 
          },
          { 
            label: 'Health Check', 
            value: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/health', 
            type: 'link' 
          },
          { 
            label: 'Docs da API', 
            value: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/docs', 
            type: 'link' 
          },
          { 
            label: 'Status do Certificado', 
            value: 'https://emissao-de-nota-automatica-gustavo-fernandes-projects-accf2b27.vercel.app/health/cert', 
            type: 'link' 
          }
        ]
      },
      {
        title: 'Variáveis de Ambiente',
        status: 'warning',
        description: 'Configurações necessárias no Vercel',
        items: [
          { label: 'CERT_PFX_BASE64', value: 'Certificado em base64', type: 'text' },
          { label: 'CERT_PFX_PASSWORD', value: 'Senha do certificado', type: 'text' },
          { label: 'DATABASE_URL', value: 'URL do banco de dados', type: 'text' },
          { label: 'JWT_SECRET', value: 'Chave secreta para autenticação', type: 'text' }
        ]
      }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'border-l-green-500 bg-green-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'error':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const tabs = [
    { id: 'requirements', label: 'Requisitos NFSe', icon: FileText },
    { id: 'certificate', label: 'Certificado', icon: Shield },
    { id: 'prefeitura', label: 'Prefeitura SP', icon: Settings },
    { id: 'api', label: 'Configuração API', icon: Server }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          Configuração do Sistema
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Guia completo para configuração do certificado e emissão de NFS-e
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {sections[activeTab]?.map((section, index) => (
          <div key={index} className={`border-l-4 ${getStatusColor(section.status)} p-6 rounded-r-lg`}>
            <div className="flex items-center mb-4">
              {getStatusIcon(section.status)}
              <h3 className="ml-2 text-lg font-medium text-gray-900">{section.title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">{section.description}</p>
            
            <div className="space-y-3">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-gray-900">{item.label}</dt>
                    <dd className="text-sm text-gray-600">
                      {item.type === 'link' ? (
                        <a
                          href={item.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          {item.value}
                          <ExternalLink className="h-4 w-4 ml-1" />
                        </a>
                      ) : item.type === 'code' ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {item.value}
                        </code>
                      ) : (
                        item.value
                      )}
                    </dd>
                  </div>
                  {item.copyable && (
                    <button
                      onClick={() => copyToClipboard(item.value)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                      title="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Actions */}
        {activeTab === 'certificate' && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ferramentas</h3>
            <div className="space-y-3">
              <button
                onClick={downloadCertificateGuide}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Guia Completo
              </button>
              <p className="text-sm text-gray-500">
                Baixa um arquivo com instruções detalhadas para configuração do certificado
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}