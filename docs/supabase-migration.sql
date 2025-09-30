-- Supabase Migration Script
-- Este script cria as tabelas necessárias com RLS (Row Level Security) configurado

-- ================================================
-- 1. TABELA CLIENTS
-- ================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    document VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    address JSONB,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para a tabela clients
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS clients_document_idx ON public.clients(document);
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_document_unique ON public.clients(user_id, document);

-- ================================================
-- 2. TABELA SUPPLIERS  
-- ================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    document VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    address JSONB,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para a tabela suppliers
CREATE INDEX IF NOT EXISTS suppliers_user_id_idx ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS suppliers_document_idx ON public.suppliers(document);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_user_document_unique ON public.suppliers(user_id, document);

-- ================================================
-- 3. TABELA SERVICE_TYPES
-- ================================================
CREATE TABLE IF NOT EXISTS public.service_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    iss_retained BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para a tabela service_types
CREATE INDEX IF NOT EXISTS service_types_user_id_idx ON public.service_types(user_id);
CREATE INDEX IF NOT EXISTS service_types_code_idx ON public.service_types(code);
CREATE INDEX IF NOT EXISTS service_types_active_idx ON public.service_types(active);
CREATE UNIQUE INDEX IF NOT EXISTS service_types_user_code_unique ON public.service_types(user_id, code);

-- ================================================
-- 4. HABILITAR RLS (ROW LEVEL SECURITY)
-- ================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. POLÍTICAS RLS - CLIENTS
-- ================================================

-- Política para SELECT - usuário vê apenas seus próprios clientes
CREATE POLICY "Users can view their own clients" ON public.clients
    FOR SELECT USING (auth.uid() = user_id);

-- Política para INSERT - usuário pode inserir apenas com seu próprio user_id
CREATE POLICY "Users can insert their own clients" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE - usuário pode atualizar apenas seus próprios clientes
CREATE POLICY "Users can update their own clients" ON public.clients
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para DELETE - usuário pode deletar apenas seus próprios clientes
CREATE POLICY "Users can delete their own clients" ON public.clients
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- 6. POLÍTICAS RLS - SUPPLIERS
-- ================================================

-- Política para SELECT - usuário vê apenas seus próprios fornecedores
CREATE POLICY "Users can view their own suppliers" ON public.suppliers
    FOR SELECT USING (auth.uid() = user_id);

-- Política para INSERT - usuário pode inserir apenas com seu próprio user_id
CREATE POLICY "Users can insert their own suppliers" ON public.suppliers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE - usuário pode atualizar apenas seus próprios fornecedores
CREATE POLICY "Users can update their own suppliers" ON public.suppliers
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para DELETE - usuário pode deletar apenas seus próprios fornecedores
CREATE POLICY "Users can delete their own suppliers" ON public.suppliers
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- 7. POLÍTICAS RLS - SERVICE_TYPES
-- ================================================

-- Política para SELECT - usuário vê apenas seus próprios tipos de serviço
CREATE POLICY "Users can view their own service types" ON public.service_types
    FOR SELECT USING (auth.uid() = user_id);

-- Política para INSERT - usuário pode inserir apenas com seu próprio user_id
CREATE POLICY "Users can insert their own service types" ON public.service_types
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE - usuário pode atualizar apenas seus próprios tipos de serviço
CREATE POLICY "Users can update their own service types" ON public.service_types
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para DELETE - usuário pode deletar apenas seus próprios tipos de serviço
CREATE POLICY "Users can delete their own service types" ON public.service_types
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- 8. FUNÇÃO PARA ATUALIZAR UPDATED_AT AUTOMATICAMENTE
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_types_updated_at ON public.service_types;
CREATE TRIGGER update_service_types_updated_at
    BEFORE UPDATE ON public.service_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 9. INSERIR ALGUNS TIPOS DE SERVIÇO PADRÃO
-- ================================================
-- Nota: Estes serão específicos por usuário, então não inserimos aqui
-- O usuário criará seus próprios tipos de serviço após fazer login

-- ================================================
-- 10. VERIFICAÇÃO FINAL
-- ================================================
-- Verificar se as tabelas foram criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('clients', 'suppliers', 'service_types');

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('clients', 'suppliers', 'service_types');