-- ================================================
-- COPIE E COLE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- Script completo e automático para inserir códigos de serviço
-- ================================================

DO $$
DECLARE
    my_user_id UUID;
    my_group_id UUID;
BEGIN
    -- Obter user ID atual
    SELECT auth.uid() INTO my_user_id;
    
    -- Verificar se já existe grupo de códigos de serviço
    SELECT id INTO my_group_id FROM formula_groups 
    WHERE user_id = my_user_id 
    AND name = 'Códigos de Serviço'
    LIMIT 1;
    
    -- Criar grupo se não existir
    IF my_group_id IS NULL THEN
        INSERT INTO formula_groups (name, description, user_id, created_at, updated_at)
        VALUES ('Códigos de Serviço', 'Lista oficial de códigos de serviços municipais', my_user_id, NOW(), NOW())
        RETURNING id INTO my_group_id;
        
        RAISE NOTICE '✅ Grupo "Códigos de Serviço" criado com sucesso!';
    ELSE
        RAISE NOTICE '📋 Usando grupo existente "Códigos de Serviço"';
    END IF;
    
    -- Limpar códigos existentes (opcional - remova se quiser manter)
    DELETE FROM formula_rows WHERE group_id = my_group_id AND user_id = my_user_id;
    
    -- Inserir códigos de serviço mais comuns
    INSERT INTO public.formula_rows (
        group_id, user_id, codigo_servico, descricao_servico, iss_retido_das, 
        val_min, val_max, indice, fator_redutor, order_position, created_at, updated_at
    ) VALUES 
    -- Programação e TI
    (my_group_id, my_user_id, '2500', 'Serviços de programação visual, comunicação visual e congêneres', false, 0, 999999, 0.05, 0, 1, NOW(), NOW()),
    (my_group_id, my_user_id, '1301', 'Processamento, armazenamento ou hospedagem de dados, textos, imagens, vídeos, páginas eletrônicas', false, 0, 999999, 0.05, 0, 2, NOW(), NOW()),
    (my_group_id, my_user_id, '2501', 'Computação gráfica, inclusive jogos eletrônicos, animação, cinema, televisão', false, 0, 999999, 0.05, 0, 3, NOW(), NOW()),
    (my_group_id, my_user_id, '2502', 'Planejamento, confecção, manutenção e atualização de páginas eletrônicas', false, 0, 999999, 0.05, 0, 4, NOW(), NOW()),
    
    -- Construção Civil
    (my_group_id, my_user_id, '1023', 'Execução por administração, empreitada ou subempreitada, de obras de construção civil', false, 0, 999999, 0.03, 0, 5, NOW(), NOW()),
    (my_group_id, my_user_id, '0501', 'Reparação, conservação e reforma de edifícios, estradas, pontes, portos', false, 0, 999999, 0.03, 0, 6, NOW(), NOW()),
    
    -- Saúde (ISS Retido)
    (my_group_id, my_user_id, '1401', 'Serviços de análises clínicas, patologia, eletricidade médica, radioterapia', true, 0, 999999, 0.02, 0, 7, NOW(), NOW()),
    (my_group_id, my_user_id, '1404', 'Hospitalização, inclusive internação, psiquiatria, fisioterapia, assistência médica', true, 0, 999999, 0.02, 0, 8, NOW(), NOW()),
    
    -- Consultoria e Assessoria
    (my_group_id, my_user_id, '1701', 'Assessoria ou consultoria de qualquer natureza, organização, programação, planejamento', false, 0, 999999, 0.05, 0, 9, NOW(), NOW()),
    (my_group_id, my_user_id, '1716', 'Auditoria', false, 0, 999999, 0.05, 0, 10, NOW(), NOW()),
    (my_group_id, my_user_id, '1601', 'Serviços de avaliação de bens e serviços de qualquer natureza', false, 0, 999999, 0.05, 0, 11, NOW(), NOW()),
    
    -- Serviços Financeiros
    (my_group_id, my_user_id, '1001', 'Agenciamento, corretagem ou intermediação de câmbio, seguros, cartões de crédito', false, 0, 999999, 0.05, 0, 12, NOW(), NOW()),
    (my_group_id, my_user_id, '1501', 'Administração de fundos, consórcio, cartão de crédito, carteira de clientes', false, 0, 999999, 0.05, 0, 13, NOW(), NOW()),
    
    -- Educação
    (my_group_id, my_user_id, '0801', 'Ensino regular pré-escolar, fundamental, médio e superior', false, 0, 999999, 0.02, 0, 14, NOW(), NOW()),
    
    -- Serviços Diversos
    (my_group_id, my_user_id, '7617', 'Tinturaria e lavanderia', false, 0, 999999, 0.05, 0, 15, NOW(), NOW());

    RAISE NOTICE '🎉 Inseridos 15 códigos de serviço com sucesso!';
    RAISE NOTICE '📊 Group ID: %', my_group_id;
    RAISE NOTICE '👤 User ID: %', my_user_id;
END $$;

-- Verificar resultado
SELECT 
    '✅ RESULTADO DA IMPORTAÇÃO' as status,
    COUNT(*) as total_codigos
FROM formula_rows fr
JOIN formula_groups fg ON fr.group_id = fg.id
WHERE fr.user_id = auth.uid() AND fg.name = 'Códigos de Serviço';

-- Listar códigos inseridos
SELECT 
    fr.codigo_servico as "Código",
    LEFT(fr.descricao_servico, 60) || '...' as "Descrição",
    CASE WHEN fr.iss_retido_das THEN 'Sim' ELSE 'Não' END as "ISS Retido",
    (fr.indice * 100) || '%' as "Alíquota"
FROM formula_rows fr
JOIN formula_groups fg ON fr.group_id = fg.id
WHERE fr.user_id = auth.uid() AND fg.name = 'Códigos de Serviço'
ORDER BY fr.order_position
LIMIT 10;

SELECT '🎯 Copie este script e cole no SQL Editor do Supabase!' as instrucao;