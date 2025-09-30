-- ================================================
-- EXTENSÃO PARA CÓDIGOS DE SERVIÇO
-- Adiciona campos de código e descrição às formula_rows
-- ================================================

-- Adicionar novos campos à tabela formula_rows
ALTER TABLE public.formula_rows 
ADD COLUMN IF NOT EXISTS codigo_servico VARCHAR(10),
ADD COLUMN IF NOT EXISTS descricao_servico TEXT;

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS formula_rows_codigo_servico_idx ON public.formula_rows(codigo_servico);
CREATE INDEX IF NOT EXISTS formula_rows_descricao_servico_idx ON public.formula_rows USING gin(to_tsvector('portuguese', descricao_servico));

-- Verificar se os campos foram adicionados
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'formula_rows' 
AND table_schema = 'public'
ORDER BY ordinal_position;