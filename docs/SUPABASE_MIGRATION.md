# Guia de Migração para Supabase

Este guia contém os passos necessários para migrar completamente o sistema de emissão de NFSe para o Supabase.

## 📋 Checklist de Migração

### ✅ 1. Autenticação (Concluído)
- [x] Configuração do Supabase Auth
- [x] Login/Registro com email e senha
- [x] Recuperação de senha
- [x] Gerenciamento de sessões
- [x] Atualização do AuthContext

### 🔄 2. Database e RLS (Em Andamento)
- [ ] Executar script SQL no dashboard do Supabase
- [ ] Verificar se as tabelas foram criadas corretamente
- [ ] Testar políticas RLS

### ⏳ 3. Conversão de APIs
- [ ] Migrar endpoints para Edge Functions
- [ ] Atualizar frontend para usar Supabase diretamente
- [ ] Remover dependência das APIs REST antigas

## 🚀 Passos de Execução

### Passo 1: Configurar Database no Supabase

1. **Acesse o Dashboard do Supabase**:
   - URL: https://ctrkdpeqiwxkvvwymipi.supabase.co
   - Vá para a seção "SQL Editor"

2. **Execute o Script de Migração**:
   ```sql
   -- Cole todo o conteúdo do arquivo docs/supabase-migration.sql
   -- E execute no SQL Editor
   ```

3. **Verificar Criação das Tabelas**:
   - Vá para "Table Editor"
   - Confirme que existem as tabelas: `clients`, `suppliers`, `service_types`
   - Cada tabela deve ter a coluna `user_id`

4. **Verificar RLS**:
   - Cada tabela deve ter o ícone de "RLS enabled"
   - Teste inserindo dados via interface para confirmar isolamento por usuário

### Passo 2: Testar Autenticação

1. **Faça Login na Aplicação**:
   ```bash
   cd ui && npm run dev
   ```

2. **Registre um Novo Usuário**:
   - Use email/senha válidos
   - Confirme que o usuário foi criado no Supabase Auth

3. **Teste Funcionalidades**:
   - Login/Logout
   - Recuperação de senha
   - Persistência de sessão

### Passo 3: Migrar Frontend para Supabase

Após confirmar que o database está funcionando, execute:

```bash
# Atualize as páginas para usar Supabase
npm run update-frontend
```

### Passo 4: Configurar Edge Functions (Opcional)

Para melhor performance e integração:

1. **Instalar Supabase CLI**:
   ```bash
   npm install supabase --save-dev
   npx supabase init
   ```

2. **Migrar APIs Críticas**:
   - Emissão de NFSe
   - Validação de documentos
   - Processamento de XML

## 🔧 Comandos Úteis

### Verificar Status do Supabase
```bash
# Instalar CLI (se necessário)
npm install -g supabase

# Fazer login
supabase login

# Verificar status do projeto
supabase status
```

### Reset Database (se necessário)
```bash
# Resetar migrações locais
supabase db reset

# Aplicar novamente
supabase db push
```

## 🔒 Configurações de Segurança

### Variáveis de Ambiente Necessárias
```env
# Já configuradas em ui/.env
VITE_SUPABASE_URL=https://ctrkdpeqiwxkvvwymipi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Para Edge Functions (se usar)
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

### Configurações RLS
- Cada usuário vê apenas seus próprios dados
- Políticas aplicadas em todas as operações (SELECT, INSERT, UPDATE, DELETE)
- Foreign key para `auth.users(id)` garante integridade

## 🧪 Testes

### Teste Manual
1. Registre 2 usuários diferentes
2. Cada um deve criar clientes/fornecedores
3. Confirme que um usuário não vê dados do outro

### Teste de Performance
1. Insira 100+ registros por tabela
2. Confirme que consultas são rápidas
3. Verifique logs de performance no Supabase

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de RLS**: "new row violates row-level security policy"
   - Verificar se `user_id` está sendo definido corretamente
   - Confirmar que usuário está autenticado

2. **Erro de Conexão**: "Invalid API key"
   - Verificar variáveis de ambiente
   - Confirmar URL e chaves do Supabase

3. **Dados não Aparecem**: Consulta retorna vazio
   - Verificar se RLS está permitindo acesso
   - Confirmar que `auth.uid()` retorna o ID correto

### Debug
```typescript
// Verificar usuário atual
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user?.id)

// Testar consulta sem RLS (apenas para debug)
const { data, error } = await supabase
  .from('clients')
  .select('*, user_id')
  .limit(5)
```

## 📈 Próximos Passos

1. ✅ **Concluir Database Setup** (Atual)
2. 🔄 **Migrar Páginas Frontend**
3. 🔧 **Implementar Edge Functions**
4. 🧪 **Testes Completos**
5. 🚀 **Deploy Final**

---

**Status**: 🔄 Em andamento - Database e RLS
**Última Atualização**: Janeiro 2025