# 🚀 GUIA DE TESTES - CRUD E IMPORTAÇÃO

## ✅ **O que foi corrigido:**

### 1. **Fornecedores (CRUD)**
- ✅ Corrigido serviço Supabase para não incluir timestamps manuais
- ✅ Adicionado logging detalhado em todo o fluxo
- ✅ FormulárioSupplierForm usando hybridSupplierService (Supabase)

### 2. **Clientes (CRUD)**  
- ✅ Corrigido serviço Supabase para não incluir timestamps manuais
- ✅ Adicionado campo municipalRegistration ao interface
- ✅ Logging detalhado implementado

### 3. **Importação**
- ✅ ImportClients.tsx atualizado para usar hybridClientService
- ✅ ImportSuppliers.tsx já estava usando supplierService correto
- ✅ Ambos com logging detalhado para debug

### 4. **Formulário NFS-e**
- ✅ Já integra corretamente com todos os services
- ✅ Carrega clientes, fornecedores e tipos de serviço
- ✅ Preenche automaticamente campos ao selecionar

---

## 🧪 **TESTES PARA EXECUTAR:**

### **Teste 1: Cadastro de Fornecedor**
```
URL: https://emissao-de-nota-automatica.vercel.app/suppliers/new

Dados de teste:
- Razão Social: "Empresa Teste Debug LTDA"
- CNPJ: "12.345.678/0001-90" 
- Email: "teste@empresa.com"
- Telefone: "(11) 99999-9999"
- Endereço completo

Resultado esperado: ✅ Criação bem-sucedida + redirecionamento
```

### **Teste 2: Cadastro de Cliente**
```  
URL: https://emissao-de-nota-automatica.vercel.app/clients/new

Dados de teste:
- Nome: "João Silva Teste"
- CPF: "123.456.789-00"
- Email: "joao@teste.com"  
- Telefone: "(11) 88888-8888"

Resultado esperado: ✅ Criação bem-sucedida + redirecionamento
```

### **Teste 3: Formulário NFS-e**
```
URL: https://emissao-de-nota-automatica.vercel.app/nfse

Verificar se:
- ✅ Campo "Cliente Cadastrado" lista os clientes
- ✅ Campo "Fornecedor Cadastrado" lista os fornecedores  
- ✅ Campo "Tipo de Serviço" lista os tipos
- ✅ Seleção preenche campos automaticamente

Resultado esperado: ✅ Todos os dropdowns populados
```

### **Teste 4: Importação de Clientes**
```
URL: https://emissao-de-nota-automatica.vercel.app/clients/import

Dados CSV de teste:
Nome,E-mail,CPF/CNPJ,Inscr.Municipal
"Cliente Importado 1","cliente1@teste.com","111.111.111-11","12345"
"Cliente Importado 2","cliente2@teste.com","222.222.222-22","54321"

Resultado esperado: ✅ Importação bem-sucedida
```

### **Teste 5: Importação de Fornecedores**
```
URL: https://emissao-de-nota-automatica.vercel.app/suppliers/import

Dados CSV de teste:
Nome,CNPJ,Email,Telefone
"Fornecedor Import 1","11.111.111/0001-11","fornec1@teste.com","(11)1111-1111"
"Fornecedor Import 2","22.222.222/0001-22","fornec2@teste.com","(11)2222-2222"

Resultado esperado: ✅ Importação bem-sucedida
```

---

## 🐛 **DEBUG:**

### **Se houver erro:**
1. Abrir DevTools (F12) → Console
2. Procurar logs que começam com:
   - `🔄 [SupplierForm]`
   - `🔄 [SupplierSupabaseService]` 
   - `🔄 [ImportClients]`
   - `❌ [Erro]`

### **Problemas conhecidos:**
- UUID automático pode precisar ser configurado no Supabase
- RLS (Row Level Security) pode estar bloqueando inserções
- Autenticação pode não estar funcionando

---

## 🔧 **Próximos passos se der erro:**

1. **Erro de UUID:** Executar SQL no Supabase:
```sql
ALTER TABLE "Supplier" ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE "Client" ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

2. **Erro de RLS:** Verificar policies no Supabase

3. **Erro de Auth:** Verificar se usuário está logado

---

## ✨ **Status Atual:**
- 🟢 Códigos corrigidos e com logs
- 🟡 Aguardando teste no ambiente real
- 🟡 UUID automático pode precisar configuração
- 🟢 Integração NFS-e já funcional