-- ================================================
-- SCRIPT ALTERNATIVO - MAIS SIMPLES
-- Copie e cole este no SQL Editor do Supabase
-- ================================================

-- PASSO 1: Obter seu user_id
SELECT auth.uid() as meu_user_id;

-- PASSO 2: Se o resultado acima for NULL, use esta query:
-- SELECT id as meu_user_id FROM auth.users LIMIT 1;

-- PASSO 3: Substitua 'SEU_USER_ID_AQUI' pelo resultado da query acima e execute:

DO $$
DECLARE
    my_user_id UUID := 'SEU_USER_ID_AQUI'; -- SUBSTITUA PELO SEU ID
    my_group_id UUID;
BEGIN
    -- Criar grupo
    INSERT INTO formula_groups (name, description, user_id, created_at, updated_at)
    VALUES ('Códigos Municipais - Lista Completa', 'Lista completa de códigos de serviços municipais', my_user_id, NOW(), NOW())
    RETURNING id INTO my_group_id;
    
    -- Inserir códigos do CSV
    INSERT INTO public.formula_rows (
        group_id, user_id, codigo_servico, descricao_servico, iss_retido_das, 
        val_min, val_max, indice, fator_redutor, order_position, created_at, updated_at
    ) VALUES 
    (my_group_id, my_user_id, '2500', 'Serviços de programação visual, comunicação visual e congêneres', false, 0, 999999, 0.05, 0, 1, NOW(), NOW()),
    (my_group_id, my_user_id, '1023', 'Execução por administração, empreitada ou subempreitada, de obras de construção civil', false, 0, 999999, 0.03, 0, 2, NOW(), NOW()),
    (my_group_id, my_user_id, '7617', 'Tinturaria e lavanderia', false, 0, 999999, 0.05, 0, 3, NOW(), NOW()),
    (my_group_id, my_user_id, '3158', 'Datilografia, digitação, estenografia, expediente, secretaria em geral', false, 0, 999999, 0.05, 0, 4, NOW(), NOW()),
    (my_group_id, my_user_id, '4030', 'Medicina e biomedicina', false, 0, 999999, 0.02, 0, 5, NOW(), NOW()),
    (my_group_id, my_user_id, '2186', 'Serviços de desenhos técnicos', false, 0, 999999, 0.05, 0, 6, NOW(), NOW()),
    (my_group_id, my_user_id, '2692', 'Disposição, sem cessão definitiva, de conteúdos de áudio por meio da internet', false, 0, 999999, 0.05, 0, 7, NOW(), NOW()),
    (my_group_id, my_user_id, '7109', 'Agenciam/intermediação programas de turismo, passeios, viagens, excursões', false, 0, 999999, 0.05, 0, 8, NOW(), NOW()),
    (my_group_id, my_user_id, '4626', 'Nutrição', false, 0, 999999, 0.02, 0, 9, NOW(), NOW()),
    (my_group_id, my_user_id, '2919', 'Suporte técnico, instalação, configuração e manutenção de programas de bancos de dados', false, 0, 999999, 0.05, 0, 10, NOW(), NOW()),
    (my_group_id, my_user_id, '5118', 'Psicologia', false, 0, 999999, 0.02, 0, 11, NOW(), NOW()),
    (my_group_id, my_user_id, '2054', 'Desenho industrial', false, 0, 999999, 0.05, 0, 12, NOW(), NOW()),
    (my_group_id, my_user_id, '4391', 'Fisioterapia', false, 0, 999999, 0.02, 0, 13, NOW(), NOW()),
    (my_group_id, my_user_id, '1899', 'Planejamento, coordenação, programação ou organização técnica', false, 0, 999999, 0.05, 0, 14, NOW(), NOW()),
    (my_group_id, my_user_id, '6084', 'Agenciamento ou intermediação de seguros', true, 0, 999999, 0.05, 0, 15, NOW(), NOW()),
    (my_group_id, my_user_id, '2881', 'Assessoria e consultoria em informática', false, 0, 999999, 0.05, 0, 16, NOW(), NOW()),
    (my_group_id, my_user_id, '7099', 'Hospedagem em apart-service condominiais, flat, apart-hotéis', false, 0, 999999, 0.05, 0, 17, NOW(), NOW()),
    (my_group_id, my_user_id, '2684', 'Processamento, armazenamento ou hospedagem de dados, textos, imagens', false, 0, 999999, 0.05, 0, 18, NOW(), NOW()),
    (my_group_id, my_user_id, '8400', 'Execução de música, individualmente ou por conjunto', false, 0, 999999, 0.05, 0, 19, NOW(), NOW()),
    (my_group_id, my_user_id, '1805', 'Acompanhamento e fiscalização da execução de obras de engenharia', false, 0, 999999, 0.03, 0, 20, NOW(), NOW()),
    (my_group_id, my_user_id, '7498', 'Conserto, restauração, manutenção e conservação de máquinas, aparelhos', false, 0, 999999, 0.05, 0, 21, NOW(), NOW()),
    (my_group_id, my_user_id, '5711', 'Ensino superior, cursos de pós-graduação, mestrado, doutorado', false, 0, 999999, 0.02, 0, 22, NOW(), NOW()),
    (my_group_id, my_user_id, '3654', 'Consultoria e assessoria econômica ou financeira', false, 0, 999999, 0.05, 0, 23, NOW(), NOW()),
    (my_group_id, my_user_id, '2496', 'Propaganda e publicidade, inclusive promoção de vendas', false, 0, 999999, 0.05, 0, 24, NOW(), NOW()),
    (my_group_id, my_user_id, '1015', 'Execução por administração, empreitada ou subempreitada, de obra hidráulica', false, 0, 999999, 0.03, 0, 25, NOW(), NOW()),
    (my_group_id, my_user_id, '1430', 'Decoração', false, 0, 999999, 0.05, 0, 26, NOW(), NOW()),
    (my_group_id, my_user_id, '6394', 'Agenciamento de publicidade e propaganda', false, 0, 999999, 0.05, 0, 27, NOW(), NOW()),
    (my_group_id, my_user_id, '3476', 'Contabilidade, inclusive serviços técnicos e auxiliares', false, 0, 999999, 0.05, 0, 28, NOW(), NOW()),
    (my_group_id, my_user_id, '6807', 'Fotografia e cinematografia, inclusive revelação, ampliação', false, 0, 999999, 0.05, 0, 29, NOW(), NOW()),
    (my_group_id, my_user_id, '7455', 'Conserto, restauração, manutenção, conservação e pintura de veículos', false, 0, 999999, 0.05, 0, 30, NOW(), NOW()),
    (my_group_id, my_user_id, '6777', 'Produção de eventos, espetáculos, entrevistas, shows, ballet, danças', false, 0, 999999, 0.05, 0, 31, NOW(), NOW()),
    (my_group_id, my_user_id, '1520', 'Engenharia, agronomia, arquitetura, urbanismo e congêneres', false, 0, 999999, 0.03, 0, 32, NOW(), NOW()),
    (my_group_id, my_user_id, '1902', 'Perícias, laudos, exames técnicos e análises técnicas', false, 0, 999999, 0.05, 0, 33, NOW(), NOW()),
    (my_group_id, my_user_id, '2935', 'Planejamento, confecção, manutenção, e atualização de páginas eletrônicas', false, 0, 999999, 0.05, 0, 34, NOW(), NOW()),
    (my_group_id, my_user_id, '7285', 'Instalação e montagem de aparelhos, máquinas e equipamentos', false, 0, 999999, 0.05, 0, 35, NOW(), NOW()),
    (my_group_id, my_user_id, '3212', 'Administração de imóveis', false, 0, 999999, 0.05, 0, 36, NOW(), NOW()),
    (my_group_id, my_user_id, '3751', 'Apresentação de palestras, conferências, seminários e congêneres', false, 0, 999999, 0.05, 0, 37, NOW(), NOW()),
    (my_group_id, my_user_id, '6793', 'Fonografia ou gravação de sons, inclusive trucagem, dublagem', false, 0, 999999, 0.05, 0, 38, NOW(), NOW()),
    (my_group_id, my_user_id, '3115', 'Assessoria ou consultoria de qualquer natureza', true, 0, 999999, 0.05, 0, 39, NOW(), NOW()),
    (my_group_id, my_user_id, '6009', 'Representação de qualquer natureza, inclusive comercial', false, 0, 999999, 0.05, 0, 40, NOW(), NOW()),
    (my_group_id, my_user_id, '6050', 'Agenciamento, corretagem ou intermediação de planos de previdência privada', false, 0, 999999, 0.05, 0, 41, NOW(), NOW()),
    (my_group_id, my_user_id, '6238', 'Agenciamento, corretagem ou intermediação de contratos de faturização (factoring)', false, 0, 999999, 0.05, 0, 42, NOW(), NOW()),
    (my_group_id, my_user_id, '6297', 'Agenciamento, corretagem ou intermediação de bens móveis ou imóveis', false, 0, 999999, 0.05, 0, 43, NOW(), NOW()),
    (my_group_id, my_user_id, '6298', 'Agenciamento, corret. Intermed. Não abrangidos em outros intens', false, 0, 999999, 0.05, 0, 44, NOW(), NOW()),
    (my_group_id, my_user_id, '6092', 'Agenciamento, corretagem ou intermediação de cartões de crédito', true, 0, 999999, 0.05, 0, 45, NOW(), NOW()),
    (my_group_id, my_user_id, '6114', 'Agenciamento, corretagem ou intermediação de planos de saúde', true, 0, 999999, 0.05, 0, 46, NOW(), NOW()),
    (my_group_id, my_user_id, '6130', 'Corretagem De Seguros', true, 0, 999999, 0.05, 0, 47, NOW(), NOW()),
    (my_group_id, my_user_id, '3220', 'Advocacia', false, 0, 999999, 0.05, 0, 48, NOW(), NOW()),
    (my_group_id, my_user_id, '6157', 'Agenciamento, corretagem ou intermediação de títulos em geral', false, 0, 999999, 0.05, 0, 49, NOW(), NOW()),
    (my_group_id, my_user_id, '6564', 'Cobranças e recebimentos por conta de terceiros e congêneres', false, 0, 999999, 0.05, 0, 50, NOW(), NOW()),
    (my_group_id, my_user_id, '4693', 'Odontologia', false, 0, 999999, 0.02, 0, 51, NOW(), NOW()),
    (my_group_id, my_user_id, '2498', 'Inserção de textos, desenhos e outros materiais de propaganda', false, 0, 999999, 0.05, 0, 52, NOW(), NOW()),
    (my_group_id, my_user_id, '5762', 'Serviços de instrução, treinamento e avaliação de conhecimentos', false, 0, 999999, 0.02, 0, 53, NOW(), NOW()),
    (my_group_id, my_user_id, '1589', 'Agrimensura, geologia e congêneres', false, 0, 999999, 0.03, 0, 54, NOW(), NOW()),
    (my_group_id, my_user_id, '1210', 'Paisagismo', false, 0, 999999, 0.05, 0, 55, NOW(), NOW()),
    (my_group_id, my_user_id, '2800', 'Licenciamento ou cessão de direito de uso de programas de computação', false, 0, 999999, 0.05, 0, 56, NOW(), NOW()),
    (my_group_id, my_user_id, '1406', 'Limpeza, manutenção e conservação de imóveis, chaminés, piscinas', false, 0, 999999, 0.05, 0, 57, NOW(), NOW()),
    (my_group_id, my_user_id, '1694', 'Elaboração de planos diretores, estudos de viabilidade, estudos organizacionais', false, 0, 999999, 0.03, 0, 58, NOW(), NOW()),
    (my_group_id, my_user_id, '7161', 'Planejamento, organização e administração de feiras, exposições, congressos', false, 0, 999999, 0.05, 0, 59, NOW(), NOW()),
    (my_group_id, my_user_id, '6808', 'Fotografia e cinematografia, inclusive revelação, ampliação, cópia', false, 0, 999999, 0.05, 0, 60, NOW(), NOW());
    
    RAISE NOTICE '🎉 Inseridos 60 códigos de serviço com sucesso!';
    RAISE NOTICE '📊 Group ID: %', my_group_id;
    RAISE NOTICE '👤 User ID: %', my_user_id;
END $$;

-- Verificar resultado
SELECT COUNT(*) as total_inseridos FROM formula_rows 
WHERE grupo_id IN (SELECT id FROM formula_groups WHERE name = 'Códigos Municipais - Lista Completa');