-- Script para implementar CRUD de Fórmulas
-- Sistema de fórmulas organizadas por grupos com linhas de configuração

-- ================================================
-- 1. TABELA FORMULA_GROUPS (Grupos de Fórmulas)
-- ================================================
CREATE TABLE IF NOT EXISTS public.formula_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL, -- Ex: "Emissao de NF Paulista"
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para a tabela formula_groups
CREATE INDEX IF NOT EXISTS formula_groups_user_id_idx ON public.formula_groups(user_id);
CREATE INDEX IF NOT EXISTS formula_groups_name_idx ON public.formula_groups(name);
CREATE INDEX IF NOT EXISTS formula_groups_is_active_idx ON public.formula_groups(is_active);

-- ================================================
-- 2. TABELA FORMULAS (Fórmulas individuais)
-- ================================================
CREATE TABLE IF NOT EXISTS public.formulas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.formula_groups(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL, -- Ex: "Anexo III"
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para a tabela formulas
CREATE INDEX IF NOT EXISTS formulas_group_id_idx ON public.formulas(group_id);
CREATE INDEX IF NOT EXISTS formulas_user_id_idx ON public.formulas(user_id);
CREATE INDEX IF NOT EXISTS formulas_name_idx ON public.formulas(name);
CREATE INDEX IF NOT EXISTS formulas_is_active_idx ON public.formulas(is_active);

-- ================================================
-- 3. TABELA FORMULA_ROWS (Linhas/Regras das Fórmulas)
-- ================================================
CREATE TABLE IF NOT EXISTS public.formula_rows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formula_id UUID NOT NULL REFERENCES public.formulas(id) ON DELETE CASCADE,
    val_min DECIMAL(14,2) NOT NULL,
    val_max DECIMAL(14,2) NOT NULL,
    indice DECIMAL(8,4) NOT NULL,
    fator_redutor DECIMAL(8,4) NOT NULL DEFAULT 0,
    iss_retido_das BOOLEAN DEFAULT FALSE,
    order_position INTEGER DEFAULT 0, -- Para ordenação das linhas
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para garantir que val_min <= val_max
    CONSTRAINT check_val_min_max CHECK (val_min <= val_max)
);

-- Índices para a tabela formula_rows
CREATE INDEX IF NOT EXISTS formula_rows_formula_id_idx ON public.formula_rows(formula_id);
CREATE INDEX IF NOT EXISTS formula_rows_user_id_idx ON public.formula_rows(user_id);
CREATE INDEX IF NOT EXISTS formula_rows_val_min_idx ON public.formula_rows(val_min);
CREATE INDEX IF NOT EXISTS formula_rows_val_max_idx ON public.formula_rows(val_max);
CREATE INDEX IF NOT EXISTS formula_rows_order_idx ON public.formula_rows(order_position);

-- ================================================
-- 4. HABILITAR RLS NAS TABELAS DE FÓRMULAS
-- ================================================
ALTER TABLE public.formula_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_rows ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. POLÍTICAS RLS PARA FORMULA_GROUPS
-- ================================================

-- SELECT: Usuários veem próprios grupos, admins veem todos
CREATE POLICY "Users can view own formula groups" ON public.formula_groups
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- INSERT: Usuários podem inserir próprios grupos, admins podem inserir qualquer
CREATE POLICY "Users can insert own formula groups" ON public.formula_groups
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- UPDATE: Usuários podem atualizar próprios grupos, admins podem atualizar todos
CREATE POLICY "Users can update own formula groups" ON public.formula_groups
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- DELETE: Usuários podem deletar próprios grupos, admins podem deletar todos
CREATE POLICY "Users can delete own formula groups" ON public.formula_groups
    FOR DELETE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- ================================================
-- 6. POLÍTICAS RLS PARA FORMULAS
-- ================================================

-- SELECT: Usuários veem próprias fórmulas, admins veem todas
CREATE POLICY "Users can view own formulas" ON public.formulas
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- INSERT: Usuários podem inserir próprias fórmulas, admins podem inserir qualquer
CREATE POLICY "Users can insert own formulas" ON public.formulas
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- UPDATE: Usuários podem atualizar próprias fórmulas, admins podem atualizar todas
CREATE POLICY "Users can update own formulas" ON public.formulas
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- DELETE: Usuários podem deletar próprias fórmulas, admins podem deletar todas
CREATE POLICY "Users can delete own formulas" ON public.formulas
    FOR DELETE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- ================================================
-- 7. POLÍTICAS RLS PARA FORMULA_ROWS
-- ================================================

-- SELECT: Usuários veem próprias linhas, admins veem todas
CREATE POLICY "Users can view own formula rows" ON public.formula_rows
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- INSERT: Usuários podem inserir próprias linhas, admins podem inserir qualquer
CREATE POLICY "Users can insert own formula rows" ON public.formula_rows
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- UPDATE: Usuários podem atualizar próprias linhas, admins podem atualizar todas
CREATE POLICY "Users can update own formula rows" ON public.formula_rows
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- DELETE: Usuários podem deletar próprias linhas, admins podem deletar todas
CREATE POLICY "Users can delete own formula rows" ON public.formula_rows
    FOR DELETE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- ================================================
-- 8. TRIGGERS PARA ATUALIZAR UPDATED_AT
-- ================================================

-- Trigger para formula_groups
DROP TRIGGER IF EXISTS update_formula_groups_updated_at ON public.formula_groups;
CREATE TRIGGER update_formula_groups_updated_at
    BEFORE UPDATE ON public.formula_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para formulas
DROP TRIGGER IF EXISTS update_formulas_updated_at ON public.formulas;
CREATE TRIGGER update_formulas_updated_at
    BEFORE UPDATE ON public.formulas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para formula_rows
DROP TRIGGER IF EXISTS update_formula_rows_updated_at ON public.formula_rows;
CREATE TRIGGER update_formula_rows_updated_at
    BEFORE UPDATE ON public.formula_rows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 9. FUNÇÃO PARA VALIDAR FAIXAS DE VALORES
-- ================================================
CREATE OR REPLACE FUNCTION validate_formula_ranges()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se não há sobreposição de faixas na mesma fórmula
    IF EXISTS (
        SELECT 1 FROM public.formula_rows 
        WHERE formula_id = NEW.formula_id 
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND (
            (NEW.val_min BETWEEN val_min AND val_max) OR
            (NEW.val_max BETWEEN val_min AND val_max) OR
            (val_min BETWEEN NEW.val_min AND NEW.val_max) OR
            (val_max BETWEEN NEW.val_min AND NEW.val_max)
        )
    ) THEN
        RAISE EXCEPTION 'Faixa de valores se sobrepõe com uma regra existente';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validação de faixas
DROP TRIGGER IF EXISTS validate_ranges ON public.formula_rows;
CREATE TRIGGER validate_ranges
    BEFORE INSERT OR UPDATE ON public.formula_rows
    FOR EACH ROW
    EXECUTE FUNCTION validate_formula_ranges();

-- ================================================
-- 10. INSERIR DADOS EXEMPLO (OPCIONAL)
-- ================================================

-- Inserir grupo exemplo (descomente se quiser dados de exemplo)
-- INSERT INTO public.formula_groups (name, description, user_id)
-- VALUES (
--     'Emissao de NF Paulista',
--     'Fórmulas para cálculo de impostos da cidade de São Paulo',
--     (SELECT id FROM auth.users WHERE email = 'admin@exemplo.com' LIMIT 1)
-- );

-- ================================================
-- 11. VERIFICAÇÕES FINAIS
-- ================================================

-- Verificar se as tabelas foram criadas
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('formula_groups', 'formulas', 'formula_rows');

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('formula_groups', 'formulas', 'formula_rows');

-- Verificar constraints
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name IN ('formula_groups', 'formulas', 'formula_rows');