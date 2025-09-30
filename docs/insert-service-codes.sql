-- ================================================
-- SCRIPT DE INSERÇÃO EM MASSA - CÓDIGOS DE SERVIÇO
-- Execute no SQL Editor do Supabase Console
-- ================================================

-- PASSO 1: Obter IDs necessários
DO $$
DECLARE
    my_user_id UUID;
    my_group_id UUID;
BEGIN
    -- Obter user ID
    SELECT auth.uid() INTO my_user_id;
    
    -- Criar grupo se não existir ou usar existente
    SELECT id INTO my_group_id FROM formula_groups 
    WHERE user_id = my_user_id 
    AND name = 'Códigos de Serviço'
    LIMIT 1;
    
    -- Se não existe grupo, criar um
    IF my_group_id IS NULL THEN
        INSERT INTO formula_groups (name, description, user_id)
        VALUES ('Códigos de Serviço', 'Códigos de serviços municipais', my_user_id)
        RETURNING id INTO my_group_id;
        
        RAISE NOTICE 'Grupo criado com ID: %', my_group_id;
    ELSE
        RAISE NOTICE 'Usando grupo existente: %', my_group_id;
    END IF;
    
    -- Inserir códigos de serviço
    INSERT INTO public.formula_rows (
        group_id, 
        user_id, 
        codigo_servico, 
        descricao_servico, 
        iss_retido_das, 
        val_min, 
        val_max, 
        indice, 
        fator_redutor, 
        order_position,
        created_at,
        updated_at
    ) VALUES 
    (my_group_id, my_user_id, '2500', 'Serviços de programação visual, comunicação visual e congêneres', false, 0, 999999, 0.05, 0, 1, NOW(), NOW()),
    (my_group_id, my_user_id, '1023', 'Execução por administração, empreitada ou subempreitada, de obras de construção civil, elétrica ou outras obras semelhantes, e respectivos serviços auxiliares ou complementares, inclusive terraplenagem, pavimentação, concretagem e a instalação e montagem', false, 0, 999999, 0.03, 0, 2, NOW(), NOW()),
    (my_group_id, my_user_id, '7617', 'Tinturaria e lavanderia', false, 0, 999999, 0.05, 0, 3, NOW(), NOW()),
    (my_group_id, my_user_id, '1401', 'Serviços de análises clínicas, patologia, eletricidade médica, radioterapia, quimioterapia, ultra-sonografia, ressonância magnética, medicina nuclear e congêneres', true, 0, 999999, 0.02, 0, 4, NOW(), NOW()),
    (my_group_id, my_user_id, '0801', 'Ensino regular pré-escolar, fundamental, médio e superior', false, 0, 999999, 0.02, 0, 5, NOW(), NOW()),
    (my_group_id, my_user_id, '1701', 'Assessoria ou consultoria de qualquer natureza, não contida em outros itens desta lista, organização, programação, planejamento, assessoria, consultoria, supervisão e congêneres', false, 0, 999999, 0.05, 0, 6, NOW(), NOW()),
    (my_group_id, my_user_id, '1404', 'Hospitalização, inclusive internação, psiquiatria, fisioterapia, assistência médica e congêneres', true, 0, 999999, 0.02, 0, 7, NOW(), NOW()),
    (my_group_id, my_user_id, '0501', 'Reparação, conservação e reforma de edifícios, estradas, pontes, portos e congêneres', false, 0, 999999, 0.03, 0, 8, NOW(), NOW()),
    (my_group_id, my_user_id, '1001', 'Agenciamento, corretagem ou intermediação de câmbio, de seguros, de cartões de crédito, de planos de saúde e de planos de previdência privada', false, 0, 999999, 0.05, 0, 9, NOW(), NOW()),
    (my_group_id, my_user_id, '1716', 'Auditoria', false, 0, 999999, 0.05, 0, 10, NOW(), NOW());

    RAISE NOTICE 'Inseridos % códigos de serviço no grupo %', 10, my_group_id;
END $$;

-- PASSO 2: Verificar se funcionou
SELECT 
    fg.name as grupo,
    fr.codigo_servico as codigo,
    LEFT(fr.descricao_servico, 50) || '...' as descricao,
    fr.iss_retido_das as iss_retido,
    fr.indice
FROM formula_rows fr
JOIN formula_groups fg ON fr.group_id = fg.id
WHERE fr.user_id = auth.uid()
AND fg.name = 'Códigos de Serviço'
ORDER BY fr.order_position;

-- PASSO 3: Contar total inserido
SELECT COUNT(*) as total_codigos_inseridos
FROM formula_rows fr
JOIN formula_groups fg ON fr.group_id = fg.id
WHERE fr.user_id = auth.uid()
AND fg.name = 'Códigos de Serviço';