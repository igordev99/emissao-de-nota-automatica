# NFS-e SP - Interface Web

Interface web para gerenciamento do sistema de emissão de NFS-e (São Paulo).

## 🚀 Como executar

### Pré-requisitos

- Node.js 20+ (recomendado)
- Backend rodando em `http://localhost:3000`

### Instalação

```bash
# Instalar dependências
npm install

# Configurar ambiente (opcional)
cp .env.example .env
# Editar .env se necessário
```

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em: `http://localhost:5173`

### Build para produção

```bash
# Build otimizado
npm run build

# Preview do build
npm run preview
```

## 📋 Funcionalidades

### ✅ Implementado
- **Dashboard**: Visão geral com estatísticas do sistema
- **Layout responsivo** com navegação lateral
- **Integração com API** do backend
- **TypeScript** para type safety
- **Tailwind CSS** para styling

### 🔄 Próximas funcionalidades
- Emissão manual de NFS-e
- CRUD de clientes e fornecedores
- Consulta e gerenciamento de notas fiscais
- Sistema de autenticação

## 🛠️ Stack Tecnológica

- **React 18** + TypeScript
- **Vite** (build tool)
- **React Router** (roteamento)
- **Axios** (cliente HTTP)
- **Tailwind CSS** (styling)
- **Heroicons** (ícones)

## 🔧 Configuração

### Variáveis de Ambiente

```env
# URL da API do backend
VITE_API_URL=http://localhost:3000
```

### Estrutura do Projeto

```
ui/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── pages/         # Páginas da aplicação
│   ├── services/      # Serviços de API
│   ├── types/         # Tipos TypeScript
│   ├── hooks/         # Custom hooks
│   └── utils/         # Utilitários
├── public/            # Assets estáticos
└── package.json
```

## 🔗 Integração com Backend

A interface consome os seguintes endpoints da API:

- `GET /api/nfse/stats` - Estatísticas gerais
- `GET /api/clients` - Listagem de clientes
- `GET /api/suppliers` - Listagem de fornecedores
- `POST /api/nfse/emitir` - Emissão de NFS-e
- E outros endpoints conforme implementação

## 📊 Monitoramento

Para monitoramento e dashboards avançados, use o Grafana já configurado:

- **Grafana**: `http://localhost:3001` (admin/admin)
- **Prometheus**: `http://localhost:9090`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request
