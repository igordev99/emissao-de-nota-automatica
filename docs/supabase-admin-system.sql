-- Script para implementar sistema de Admin Global
-- Este script adiciona roles de usuário e políticas admin ao sistema existente

-- ================================================
-- 1. TABELA DE ROLES/PERFIS DE USUÁRIO
-- ================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    company_name VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para a tabela user_profiles
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles(email);

-- ================================================
-- 2. FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
-- ================================================
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = user_uuid 
        AND role IN ('admin', 'super_admin')
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 3. FUNÇÃO PARA OBTER ROLE DO USUÁRIO
-- ================================================
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role 
    FROM public.user_profiles 
    WHERE user_id = user_uuid 
    AND is_active = TRUE;
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 4. HABILITAR RLS NA TABELA USER_PROFILES
-- ================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. POLÍTICAS RLS PARA USER_PROFILES
-- ================================================

-- Usuários podem ver seu próprio perfil e admins podem ver todos
CREATE POLICY "Users can view own profile and admins see all" ON public.user_profiles
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- Apenas o próprio usuário pode inserir seu perfil
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar próprio perfil, admins podem atualizar todos (exceto role de super_admin)
CREATE POLICY "Users update own profile, admins update all" ON public.user_profiles
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (is_admin(auth.uid()) AND role != 'super_admin')
    );

-- Apenas super_admins podem deletar perfis
CREATE POLICY "Only super_admins can delete profiles" ON public.user_profiles
    FOR DELETE USING (
        get_user_role(auth.uid()) = 'super_admin'
    );

-- ================================================
-- 6. ATUALIZAR POLÍTICAS DAS TABELAS EXISTENTES
-- ================================================

-- CLIENTS: Admins podem ver todos os clientes
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their own clients" ON public.clients
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
CREATE POLICY "Users can insert their own clients" ON public.clients
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update their own clients" ON public.clients
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Users can delete their own clients" ON public.clients
    FOR DELETE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- SUPPLIERS: Admins podem ver todos os fornecedores
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
CREATE POLICY "Users can view their own suppliers" ON public.suppliers
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert their own suppliers" ON public.suppliers;
CREATE POLICY "Users can insert their own suppliers" ON public.suppliers
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
CREATE POLICY "Users can update their own suppliers" ON public.suppliers
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;
CREATE POLICY "Users can delete their own suppliers" ON public.suppliers
    FOR DELETE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- SERVICE_TYPES: Admins podem ver todos os tipos de serviços
DROP POLICY IF EXISTS "Users can view their own service types" ON public.service_types;
CREATE POLICY "Users can view their own service types" ON public.service_types
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert their own service types" ON public.service_types;
CREATE POLICY "Users can insert their own service types" ON public.service_types
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own service types" ON public.service_types;
CREATE POLICY "Users can update their own service types" ON public.service_types
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete their own service types" ON public.service_types;
CREATE POLICY "Users can delete their own service types" ON public.service_types
    FOR DELETE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- ================================================
-- 7. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- ================================================
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, role, company_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        'user',  -- Role padrão
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Empresa')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil quando usuário se registra
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- ================================================
-- 8. TRIGGER PARA ATUALIZAR UPDATED_AT EM USER_PROFILES
-- ================================================
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 9. CRIAR PRIMEIRO SUPER ADMIN (OPCIONAL)
-- ================================================
-- IMPORTANTE: Execute isso APENAS se você quiser criar um super admin
-- Substitua 'seu-email@exemplo.com' pelo email que você quer como super admin

-- INSERT INTO public.user_profiles (user_id, email, role, company_name)
-- SELECT 
--     id, 
--     'seu-email@exemplo.com', 
--     'super_admin',
--     'Administração'
-- FROM auth.users 
-- WHERE email = 'seu-email@exemplo.com'
-- ON CONFLICT (user_id) DO UPDATE SET 
--     role = 'super_admin';

-- ================================================
-- 10. VERIFICAÇÕES FINAIS
-- ================================================

-- Verificar se a tabela foi criada
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Verificar se as funções foram criadas
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'get_user_role', 'create_user_profile');

-- Listar roles disponíveis
SELECT DISTINCT role FROM public.user_profiles;