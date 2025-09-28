# Sistema de Administração Global

Este documento descreve como configurar e usar o sistema de administração global que permite ver todos os dados de todos os usuários.

## 🔧 **Configuração Inicial**

### 1. Execute o Script Admin no Supabase

1. **Acesse o Dashboard do Supabase**:
   - URL: https://ctrkdpeqiwxkvvwymipi.supabase.co
   - Vá para a seção **"SQL Editor"**

2. **Execute o Script Admin**:
   - Copie todo o conteúdo do arquivo `docs/supabase-admin-system.sql`
   - Cole no SQL Editor e execute

### 2. Criar o Primeiro Super Admin

Depois de executar o script, você precisa promover um usuário existente para Super Admin:

```sql
-- Substitua 'seu-email@exemplo.com' pelo email do usuário que será Super Admin
INSERT INTO public.user_profiles (user_id, email, role, company_name)
SELECT 
    id, 
    email, 
    'super_admin',
    'Administração Global'
FROM auth.users 
WHERE email = 'seu-email@exemplo.com'
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'super_admin',
    company_name = 'Administração Global';
```

**OU** se o perfil já existir:

```sql
-- Atualizar usuário existente para Super Admin
UPDATE public.user_profiles 
SET role = 'super_admin', company_name = 'Administração Global'
WHERE email = 'seu-email@exemplo.com';
```

## 👥 **Hierarquia de Usuários**

### **1. Usuário Normal (`user`)**
- Vê apenas seus próprios dados (clientes, fornecedores, tipos de serviço)
- Não pode ver dados de outros usuários
- Não tem acesso às funções administrativas

### **2. Admin (`admin`)**
- Vê **TODOS os dados** de **TODOS os usuários**
- Pode criar/editar/deletar qualquer registro
- Pode promover usuários normais para Admin
- Pode ativar/desativar usuários
- **NÃO pode** promover para Super Admin

### **3. Super Admin (`super_admin`)**
- Todos os privilégios do Admin
- Pode promover usuários para Admin OU Super Admin
- Pode rebaixar Admins para usuário normal
- Pode deletar perfis de usuários
- Controle total sobre o sistema

## 🚀 **Como Usar**

### **Para Usuários Normais:**
1. Faça login normalmente
2. Veja apenas seus próprios dados
3. Sistema funciona como antes

### **Para Admins:**
1. Faça login com conta de Admin
2. **Dashboard mostra dados globais** de todos os usuários
3. **Listas mostram todos os registros** com informação do proprietário
4. Pode gerenciar usuários em `/admin/users` (se implementado nas rotas)

### **Identificação de Admin no Frontend:**
```typescript
import { useAuth } from '../contexts/AuthContext';

function MeuComponente() {
  const { isAdmin, isSuperAdmin, profile } = useAuth();
  
  if (isAdmin) {
    // Usuário é Admin ou Super Admin
    // Mostrar dados globais
  }
  
  if (isSuperAdmin) {
    // Usuário é Super Admin
    // Mostrar controles de Super Admin
  }
}
```

## 🔒 **Segurança RLS**

### **Políticas Implementadas:**

**Clientes, Fornecedores, Tipos de Serviço:**
- **SELECT**: `user_id = auth.uid() OR is_admin(auth.uid())`
- **INSERT**: `user_id = auth.uid() OR is_admin(auth.uid())`
- **UPDATE**: `user_id = auth.uid() OR is_admin(auth.uid())`
- **DELETE**: `user_id = auth.uid() OR is_admin(auth.uid())`

**Perfis de Usuários:**
- **SELECT**: Próprio perfil OU Admin
- **INSERT**: Apenas próprio perfil
- **UPDATE**: Próprio perfil OU Admin (exceto Super Admin)
- **DELETE**: Apenas Super Admin

## 🧪 **Testando o Sistema**

### **1. Teste como Usuário Normal:**
```
Email: teste@usuario.com
Senha: 123456789
Role: user (padrão)
```
- Deve ver apenas próprios dados
- Não deve ter acesso a área admin

### **2. Teste como Admin:**
```
Email: admin@teste.com  
Senha: 123456789
Role: admin (promovido via SQL)
```
- Deve ver dados de TODOS os usuários
- Pode gerenciar outros usuários
- Não pode promover para Super Admin

### **3. Teste como Super Admin:**
```
Email: superadmin@teste.com
Senha: 123456789  
Role: super_admin (promovido via SQL)
```
- Controle total do sistema
- Pode promover qualquer usuário
- Pode deletar perfis

## 📊 **Funcionalidades Admin**

### **Dashboard Global:**
- Estatísticas de todos os usuários
- Total de clientes/fornecedores globais
- Usuários ativos/inativos

### **Listagens Globais:**
- Clientes de todos os usuários (com indicação do proprietário)
- Fornecedores de todos os usuários
- Tipos de serviços de todos os usuários

### **Gerenciamento de Usuários:**
- Lista todos os usuários registrados
- Promover/rebaixar roles
- Ativar/desativar contas
- Estatísticas de usuários

## ⚠️ **Importante**

1. **Super Admins têm controle total** - use com cuidado
2. **Admins podem ver dados sensíveis** de todos os usuários
3. **RLS garante segurança** - mesmo com bugs de frontend, o banco protege
4. **Logs são importantes** - monitore ações administrativas
5. **Backup regular** - dados críticos devem ter backup

## 🔧 **Comandos Úteis**

### **Ver todos os perfis:**
```sql
SELECT email, role, is_active, company_name, created_at 
FROM user_profiles 
ORDER BY created_at DESC;
```

### **Ver estatísticas:**
```sql
SELECT 
  role,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM user_profiles 
GROUP BY role;
```

### **Promover usuário:**
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'usuario@email.com';
```

---

**Status**: ✅ Sistema Admin implementado e pronto para uso
**Próximo**: Testar funcionalidades e implementar interface admin no frontend