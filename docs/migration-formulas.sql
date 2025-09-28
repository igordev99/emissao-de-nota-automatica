-- ================================================
-- MIGRAÇÃO SEGURA PARA FÓRMULAS SIMPLIFICADAS
-- Execute este script no SQL Editor do Supabase
-- ================================================

-- Passo 1: Remover triggers e funções antigas
DROP TRIGGER IF EXISTS validate_ranges ON public.formula_rows;
DROP TRIGGER IF EXISTS update_formula_rows_updated_at ON public.formula_rows;
DROP TRIGGER IF EXISTS update_formulas_updated_at ON public.formulas;
DROP TRIGGER IF EXISTS update_formula_groups_updated_at ON public.formula_groups;
DROP FUNCTION IF EXISTS validate_formula_ranges();

-- Passo 2: Remover políticas RLS antigas
DROP POLICY IF EXISTS "Users can view own formula rows" ON public.formula_rows;
DROP POLICY IF EXISTS "Users can insert own formula rows" ON public.formula_rows;
DROP POLICY IF EXISTS "Users can update own formula rows" ON public.formula_rows;
DROP POLICY IF EXISTS "Users can delete own formula rows" ON public.formula_rows;
DROP POLICY IF EXISTS "Users can view own formulas" ON public.formulas;
DROP POLICY IF EXISTS "Users can insert own formulas" ON public.formulas;
DROP POLICY IF EXISTS "Users can update own formulas" ON public.formulas;
DROP POLICY IF EXISTS "Users can delete own formulas" ON public.formulas;
DROP POLICY IF EXISTS "Users can view own formula groups" ON public.formula_groups;
DROP POLICY IF EXISTS "Users can insert own formula groups" ON public.formula_groups;
DROP POLICY IF EXISTS "Users can update own formula groups" ON public.formula_groups;
DROP POLICY IF EXISTS "Users can delete own formula groups" ON public.formula_groups;

-- Passo 3: Remover tabelas antigas
DROP TABLE IF EXISTS public.formula_rows CASCADE;
DROP TABLE IF EXISTS public.formulas CASCADE;
DROP TABLE IF EXISTS public.formula_groups CASCADE;

-- ================================================
-- CRIAÇÃO DAS NOVAS TABELAS
-- ================================================

-- Tabela: formula_groups
CREATE TABLE public.formula_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: formula_rows (diretamente ligada ao grupo)
CREATE TABLE public.formula_rows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.formula_groups(id) ON DELETE CASCADE,
    val_min DECIMAL(14,2) NOT NULL,
    val_max DECIMAL(14,2) NOT NULL,
    indice DECIMAL(8,4) NOT NULL,
    fator_redutor DECIMAL(8,4) NOT NULL DEFAULT 0,
    iss_retido_das BOOLEAN DEFAULT FALSE,
    order_position INTEGER DEFAULT 0,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_val_min_max CHECK (val_min <= val_max)
);

-- ================================================
-- ÍNDICES
-- ================================================

-- formula_groups
CREATE INDEX formula_groups_user_id_idx ON public.formula_groups(user_id);
CREATE INDEX formula_groups_name_idx ON public.formula_groups(name);
CREATE INDEX formula_groups_is_active_idx ON public.formula_groups(is_active);

-- formula_rows
CREATE INDEX formula_rows_group_id_idx ON public.formula_rows(group_id);
CREATE INDEX formula_rows_user_id_idx ON public.formula_rows(user_id);
CREATE INDEX formula_rows_val_min_idx ON public.formula_rows(val_min);
CREATE INDEX formula_rows_val_max_idx ON public.formula_rows(val_max);
CREATE INDEX formula_rows_order_idx ON public.formula_rows(order_position);

-- ================================================
-- RLS (ROW LEVEL SECURITY)
-- ================================================

-- Habilitar RLS
ALTER TABLE public.formula_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_rows ENABLE ROW LEVEL SECURITY;

-- Políticas para formula_groups
CREATE POLICY "Users can view own formula groups" ON public.formula_groups
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

CREATE POLICY "Users can insert own formula groups" ON public.formula_groups
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

CREATE POLICY "Users can update own formula groups" ON public.formula_groups
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

CREATE POLICY "Users can delete own formula groups" ON public.formula_groups
    FOR DELETE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- Políticas para formula_rows
CREATE POLICY "Users can view own formula rows" ON public.formula_rows
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

CREATE POLICY "Users can insert own formula rows" ON public.formula_rows
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

CREATE POLICY "Users can update own formula rows" ON public.formula_rows
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

CREATE POLICY "Users can delete own formula rows" ON public.formula_rows
    FOR DELETE USING (
        auth.uid() = user_id OR 
        is_admin(auth.uid())
    );

-- ================================================
-- TRIGGERS PARA UPDATED_AT
-- ================================================

-- Trigger para formula_groups
CREATE TRIGGER update_formula_groups_updated_at
    BEFORE UPDATE ON public.formula_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para formula_rows
CREATE TRIGGER update_formula_rows_updated_at
    BEFORE UPDATE ON public.formula_rows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FUNÇÃO DE VALIDAÇÃO DE FAIXAS
-- ================================================

CREATE OR REPLACE FUNCTION validate_formula_ranges()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se não há sobreposição de faixas no mesmo grupo
    IF EXISTS (
        SELECT 1 FROM public.formula_rows 
        WHERE group_id = NEW.group_id 
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND (
            (NEW.val_min BETWEEN val_min AND val_max) OR
            (NEW.val_max BETWEEN val_min AND val_max) OR
            (val_min BETWEEN NEW.val_min AND NEW.val_max) OR
            (val_max BETWEEN NEW.val_min AND NEW.val_max)
        )
    ) THEN
        RAISE EXCEPTION 'Faixa de valores se sobrepõe com uma regra existente no mesmo grupo';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validação de faixas
CREATE TRIGGER validate_ranges
    BEFORE INSERT OR UPDATE ON public.formula_rows
    FOR EACH ROW
    EXECUTE FUNCTION validate_formula_ranges();

-- ================================================
-- VERIFICAÇÃO FINAL
-- ================================================

-- Verificar se as tabelas foram criadas
SELECT 'Tabelas criadas:' as status;
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('formula_groups', 'formula_rows');

-- Verificar se RLS está habilitado
SELECT 'RLS habilitado:' as status;
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('formula_groups', 'formula_rows');

-- Sucesso!
SELECT 'Migração concluída com sucesso!' as resultado;