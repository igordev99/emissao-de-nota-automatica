-- ================================================
-- CRIAR TABELA service_types NO SUPABASE
-- Execute no SQL Editor do Supabase
-- ================================================

-- Criar tabela service_types (snake_case para compatibilidade com o frontend)
CREATE TABLE IF NOT EXISTS public.service_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    iss_retained BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS service_types_code_idx ON public.service_types(code);
CREATE INDEX IF NOT EXISTS service_types_active_idx ON public.service_types(active);
CREATE INDEX IF NOT EXISTS service_types_user_id_idx ON public.service_types(user_id);

-- Constraint única: código único por usuário
CREATE UNIQUE INDEX IF NOT EXISTS service_types_user_code_unique 
ON public.service_types(user_id, code);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários só podem ver/modificar seus próprios service types
-- Remover políticas existentes se necessário e recriar
DROP POLICY IF EXISTS "Users can view their own service types" ON public.service_types;
DROP POLICY IF EXISTS "Users can insert their own service types" ON public.service_types;
DROP POLICY IF EXISTS "Users can update their own service types" ON public.service_types;
DROP POLICY IF EXISTS "Users can delete their own service types" ON public.service_types;

CREATE POLICY "Users can view their own service types" 
ON public.service_types FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service types" 
ON public.service_types FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service types" 
ON public.service_types FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service types" 
ON public.service_types FOR DELETE 
USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_service_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_service_types_updated_at_trigger ON public.service_types;
CREATE TRIGGER update_service_types_updated_at_trigger
    BEFORE UPDATE ON public.service_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_service_types_updated_at();

-- Verificar resultado
SELECT 
    '✅ TABELA CRIADA COM SUCESSO' as status,
    'service_types' as tabela,
    COUNT(*) as registros_existentes
FROM public.service_types;

-- ✅ Tabela service_types criada com sucesso!
-- 📋 Estrutura: id, code, name, description, iss_retained, active, user_id, created_at, updated_at
-- 🔒 RLS habilitado - usuários só veem seus próprios registros
-- 🔑 Constraint único: code por usuário