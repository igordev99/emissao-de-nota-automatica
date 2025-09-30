-- ================================================
-- SCRIPT SIMPLES - CÓDIGOS DE SERVIÇO SEM VALIDAÇÃO DE FAIXAS
-- Execute no SQL Editor do Supabase
-- ================================================

DO $$
DECLARE
    my_user_id UUID;
    my_group_id UUID;
BEGIN
    -- Obter user ID
    SELECT COALESCE(auth.uid(), (SELECT id FROM auth.users LIMIT 1)) INTO my_user_id;
    
    -- Criar grupo
    INSERT INTO formula_groups (name, description, user_id, created_at, updated_at)
    VALUES ('Códigos de Serviço - Lista Completa', 'Lista de códigos de serviços municipais (sem cálculo de faixas)', my_user_id, NOW(), NOW())
    RETURNING id INTO my_group_id;
    
    -- Desabilitar temporariamente a validação de faixas
    DROP TRIGGER IF EXISTS validate_ranges ON public.formula_rows;
    
    -- Inserir códigos usando valores únicos para evitar conflitos
    INSERT INTO public.formula_rows (
        group_id, user_id, codigo_servico, descricao_servico, iss_retido_das, 
        val_min, val_max, indice, fator_redutor, order_position, created_at, updated_at
    ) VALUES 
    -- Usando order_position como base para val_min/val_max para evitar sobreposições
    (my_group_id, my_user_id, '2500', 'Serviços de programação visual, comunicação visual e congêneres', false, 1, 1, 0.05, 0, 1, NOW(), NOW()),
    (my_group_id, my_user_id, '1023', 'Execução por administração, empreitada ou subempreitada, de obras de construção civil', false, 2, 2, 0.03, 0, 2, NOW(), NOW()),
    (my_group_id, my_user_id, '7617', 'Tinturaria e lavanderia', false, 3, 3, 0.05, 0, 3, NOW(), NOW()),
    (my_group_id, my_user_id, '3158', 'Datilografia, digitação, estenografia, expediente, secretaria em geral', false, 4, 4, 0.05, 0, 4, NOW(), NOW()),
    (my_group_id, my_user_id, '4030', 'Medicina e biomedicina', false, 5, 5, 0.02, 0, 5, NOW(), NOW()),
    (my_group_id, my_user_id, '2186', 'Serviços de desenhos técnicos', false, 6, 6, 0.05, 0, 6, NOW(), NOW()),
    (my_group_id, my_user_id, '2692', 'Disposição, sem cessão definitiva, de conteúdos de áudio por meio da internet', false, 7, 7, 0.05, 0, 7, NOW(), NOW()),
    (my_group_id, my_user_id, '7109', 'Agenciam/intermediação programas de turismo, passeios, viagens, excursões', false, 8, 8, 0.05, 0, 8, NOW(), NOW()),
    (my_group_id, my_user_id, '4626', 'Nutrição', false, 9, 9, 0.02, 0, 9, NOW(), NOW()),
    (my_group_id, my_user_id, '2919', 'Suporte técnico, instalação, configuração e manutenção de programas de bancos de dados', false, 10, 10, 0.05, 0, 10, NOW(), NOW()),
    (my_group_id, my_user_id, '5118', 'Psicologia', false, 11, 11, 0.02, 0, 11, NOW(), NOW()),
    (my_group_id, my_user_id, '2054', 'Desenho industrial', false, 12, 12, 0.05, 0, 12, NOW(), NOW()),
    (my_group_id, my_user_id, '4391', 'Fisioterapia', false, 13, 13, 0.02, 0, 13, NOW(), NOW()),
    (my_group_id, my_user_id, '1899', 'Planejamento, coordenação, programação ou organização técnica', false, 14, 14, 0.05, 0, 14, NOW(), NOW()),
    (my_group_id, my_user_id, '6084', 'Agenciamento ou intermediação de seguros', true, 15, 15, 0.05, 0, 15, NOW(), NOW()),
    (my_group_id, my_user_id, '2881', 'Assessoria e consultoria em informática', false, 16, 16, 0.05, 0, 16, NOW(), NOW()),
    (my_group_id, my_user_id, '7099', 'Hospedagem em apart-service condominiais, flat, apart-hotéis', false, 17, 17, 0.05, 0, 17, NOW(), NOW()),
    (my_group_id, my_user_id, '2684', 'Processamento, armazenamento ou hospedagem de dados, textos, imagens', false, 18, 18, 0.05, 0, 18, NOW(), NOW()),
    (my_group_id, my_user_id, '8400', 'Execução de música, individualmente ou por conjunto', false, 19, 19, 0.05, 0, 19, NOW(), NOW()),
    (my_group_id, my_user_id, '1805', 'Acompanhamento e fiscalização da execução de obras de engenharia', false, 20, 20, 0.03, 0, 20, NOW(), NOW()),
    (my_group_id, my_user_id, '7498', 'Conserto, restauração, manutenção e conservação de máquinas, aparelhos', false, 21, 21, 0.05, 0, 21, NOW(), NOW()),
    (my_group_id, my_user_id, '5711', 'Ensino superior, cursos de pós-graduação, mestrado, doutorado', false, 22, 22, 0.02, 0, 22, NOW(), NOW()),
    (my_group_id, my_user_id, '3654', 'Consultoria e assessoria econômica ou financeira', false, 23, 23, 0.05, 0, 23, NOW(), NOW()),
    (my_group_id, my_user_id, '2496', 'Propaganda e publicidade, inclusive promoção de vendas', false, 24, 24, 0.05, 0, 24, NOW(), NOW()),
    (my_group_id, my_user_id, '1015', 'Execução por administração, empreitada ou subempreitada, de obra hidráulica', false, 25, 25, 0.03, 0, 25, NOW(), NOW()),
    (my_group_id, my_user_id, '1430', 'Decoração', false, 26, 26, 0.05, 0, 26, NOW(), NOW()),
    (my_group_id, my_user_id, '6394', 'Agenciamento de publicidade e propaganda', false, 27, 27, 0.05, 0, 27, NOW(), NOW()),
    (my_group_id, my_user_id, '3476', 'Contabilidade, inclusive serviços técnicos e auxiliares', false, 28, 28, 0.05, 0, 28, NOW(), NOW()),
    (my_group_id, my_user_id, '6807', 'Fotografia e cinematografia, inclusive revelação, ampliação', false, 29, 29, 0.05, 0, 29, NOW(), NOW()),
    (my_group_id, my_user_id, '7455', 'Conserto, restauração, manutenção, conservação e pintura de veículos', false, 30, 30, 0.05, 0, 30, NOW(), NOW()),
    (my_group_id, my_user_id, '6777', 'Produção de eventos, espetáculos, entrevistas, shows, ballet, danças', false, 31, 31, 0.05, 0, 31, NOW(), NOW()),
    (my_group_id, my_user_id, '1520', 'Engenharia, agronomia, arquitetura, urbanismo e congêneres', false, 32, 32, 0.03, 0, 32, NOW(), NOW()),
    (my_group_id, my_user_id, '1902', 'Perícias, laudos, exames técnicos e análises técnicas', false, 33, 33, 0.05, 0, 33, NOW(), NOW()),
    (my_group_id, my_user_id, '2935', 'Planejamento, confecção, manutenção, e atualização de páginas eletrônicas', false, 34, 34, 0.05, 0, 34, NOW(), NOW()),
    (my_group_id, my_user_id, '7285', 'Instalação e montagem de aparelhos, máquinas e equipamentos', false, 35, 35, 0.05, 0, 35, NOW(), NOW()),
    (my_group_id, my_user_id, '3212', 'Administração de imóveis', false, 36, 36, 0.05, 0, 36, NOW(), NOW()),
    (my_group_id, my_user_id, '3751', 'Apresentação de palestras, conferências, seminários e congêneres', false, 37, 37, 0.05, 0, 37, NOW(), NOW()),
    (my_group_id, my_user_id, '6793', 'Fonografia ou gravação de sons, inclusive trucagem, dublagem', false, 38, 38, 0.05, 0, 38, NOW(), NOW()),
    (my_group_id, my_user_id, '3115', 'Assessoria ou consultoria de qualquer natureza', true, 39, 39, 0.05, 0, 39, NOW(), NOW()),
    (my_group_id, my_user_id, '6009', 'Representação de qualquer natureza, inclusive comercial', false, 40, 40, 0.05, 0, 40, NOW(), NOW()),
    (my_group_id, my_user_id, '6050', 'Agenciamento, corretagem ou intermediação de planos de previdência privada', false, 41, 41, 0.05, 0, 41, NOW(), NOW()),
    (my_group_id, my_user_id, '6238', 'Agenciamento, corretagem ou intermediação de contratos de faturização (factoring)', false, 42, 42, 0.05, 0, 42, NOW(), NOW()),
    (my_group_id, my_user_id, '6297', 'Agenciamento, corretagem ou intermediação de bens móveis ou imóveis', false, 43, 43, 0.05, 0, 43, NOW(), NOW()),
    (my_group_id, my_user_id, '6298', 'Agenciamento, corret. Intermed. Não abrangidos em outros intens', false, 44, 44, 0.05, 0, 44, NOW(), NOW()),
    (my_group_id, my_user_id, '6092', 'Agenciamento, corretagem ou intermediação de cartões de crédito', true, 45, 45, 0.05, 0, 45, NOW(), NOW()),
    (my_group_id, my_user_id, '6114', 'Agenciamento, corretagem ou intermediação de planos de saúde', true, 46, 46, 0.05, 0, 46, NOW(), NOW()),
    (my_group_id, my_user_id, '6130', 'Corretagem De Seguros', true, 47, 47, 0.05, 0, 47, NOW(), NOW()),
    (my_group_id, my_user_id, '3220', 'Advocacia', false, 48, 48, 0.05, 0, 48, NOW(), NOW()),
    (my_group_id, my_user_id, '6157', 'Agenciamento, corretagem ou intermediação de títulos em geral', false, 49, 49, 0.05, 0, 49, NOW(), NOW()),
    (my_group_id, my_user_id, '6564', 'Cobranças e recebimentos por conta de terceiros e congêneres', false, 50, 50, 0.05, 0, 50, NOW(), NOW()),
    (my_group_id, my_user_id, '4693', 'Odontologia', false, 51, 51, 0.02, 0, 51, NOW(), NOW()),
    (my_group_id, my_user_id, '2498', 'Inserção de textos, desenhos e outros materiais de propaganda', false, 52, 52, 0.05, 0, 52, NOW(), NOW()),
    (my_group_id, my_user_id, '5762', 'Serviços de instrução, treinamento e avaliação de conhecimentos', false, 53, 53, 0.02, 0, 53, NOW(), NOW()),
    (my_group_id, my_user_id, '1589', 'Agrimensura, geologia e congêneres', false, 54, 54, 0.03, 0, 54, NOW(), NOW()),
    (my_group_id, my_user_id, '1210', 'Paisagismo', false, 55, 55, 0.05, 0, 55, NOW(), NOW()),
    (my_group_id, my_user_id, '2800', 'Licenciamento ou cessão de direito de uso de programas de computação', false, 56, 56, 0.05, 0, 56, NOW(), NOW()),
    (my_group_id, my_user_id, '1406', 'Limpeza, manutenção e conservação de imóveis, chaminés, piscinas', false, 57, 57, 0.05, 0, 57, NOW(), NOW()),
    (my_group_id, my_user_id, '1694', 'Elaboração de planos diretores, estudos de viabilidade, estudos organizacionais', false, 58, 58, 0.03, 0, 58, NOW(), NOW()),
    (my_group_id, my_user_id, '7161', 'Planejamento, organização e administração de feiras, exposições, congressos', false, 59, 59, 0.05, 0, 59, NOW(), NOW()),
    (my_group_id, my_user_id, '6808', 'Fotografia e cinematografia, inclusive revelação, ampliação, cópia', false, 60, 60, 0.05, 0, 60, NOW(), NOW());
    
    -- Recriar o trigger após inserção
    CREATE TRIGGER validate_ranges
        BEFORE INSERT OR UPDATE ON public.formula_rows
        FOR EACH ROW
        EXECUTE FUNCTION validate_formula_ranges();
    
    RAISE NOTICE '🎉 Inseridos 60 códigos de serviço com sucesso!';
    RAISE NOTICE '📊 Group ID: %', my_group_id;
    RAISE NOTICE '👤 User ID: %', my_user_id;
    RAISE NOTICE '⚠️ Os valores val_min/val_max são simbólicos (não representam faixas reais de cálculo)';
END $$;

-- Verificar resultado
SELECT 
    '✅ IMPORTAÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_codigos_inseridos,
    COUNT(CASE WHEN iss_retido_das THEN 1 END) as com_iss_retido,
    COUNT(CASE WHEN NOT iss_retido_das THEN 1 END) as sem_iss_retido
FROM formula_rows fr
JOIN formula_groups fg ON fr.group_id = fg.id
WHERE fg.name = 'Códigos de Serviço - Lista Completa';

-- Mostrar códigos inseridos
SELECT 
    fr.codigo_servico as "Código",
    LEFT(fr.descricao_servico, 80) || '...' as "Descrição",
    CASE WHEN fr.iss_retido_das THEN 'Sim' ELSE 'Não' END as "ISS Retido",
    (fr.indice * 100) || '%' as "Alíquota"
FROM formula_rows fr
JOIN formula_groups fg ON fr.group_id = fg.id
WHERE fg.name = 'Códigos de Serviço - Lista Completa'
ORDER BY fr.order_position
LIMIT 10;