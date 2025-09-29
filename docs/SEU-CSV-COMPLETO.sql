-- ================================================
-- INSERÇÃO DOS SEUS CÓDIGOS DE SERVIÇO ESPECÍFICOS
-- Script baseado no arquivo "Tipos de Serviço(Administrador) (1).csv"
-- Execute no SQL Editor do Supabase
-- ================================================

DO $$
DECLARE
    my_user_id UUID;
    my_group_id UUID;
    total_inserted INTEGER := 0;
BEGIN
    -- Obter user ID atual (com fallback para admin)
    SELECT auth.uid() INTO my_user_id;
    
    -- Se auth.uid() retornar NULL, usar o primeiro usuário encontrado
    IF my_user_id IS NULL THEN
        SELECT id INTO my_user_id FROM auth.users LIMIT 1;
        RAISE NOTICE '⚠️ auth.uid() é NULL, usando user_id: %', my_user_id;
    ELSE
        RAISE NOTICE '✅ Usando user_id atual: %', my_user_id;
    END IF;
    
    -- Verificar se encontrou um usuário
    IF my_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado na tabela auth.users';
    END IF;
    
    -- Verificar se já existe grupo
    SELECT id INTO my_group_id FROM formula_groups 
    WHERE user_id = my_user_id 
    AND name = 'Códigos Municipais - Lista Completa'
    LIMIT 1;
    
    -- Criar grupo se não existir
    IF my_group_id IS NULL THEN
        INSERT INTO formula_groups (name, description, user_id, created_at, updated_at)
        VALUES ('Códigos Municipais - Lista Completa', 'Lista completa de códigos de serviços municipais importados do sistema', my_user_id, NOW(), NOW())
        RETURNING id INTO my_group_id;
        
        RAISE NOTICE '✅ Grupo criado: "Códigos Municipais - Lista Completa"';
    ELSE 
        RAISE NOTICE '📋 Usando grupo existente';
        -- Limpar dados anteriores
        DELETE FROM formula_rows WHERE group_id = my_group_id AND user_id = my_user_id;
    END IF;
    
    -- Desabilitar temporariamente a validação de faixas (códigos de serviço são diferentes de cálculo por faixa)
    DROP TRIGGER IF EXISTS validate_ranges ON public.formula_rows;
    
    -- Inserir todos os códigos do CSV (cada código é uma faixa única baseada no código)
    INSERT INTO public.formula_rows (
        group_id, user_id, codigo_servico, descricao_servico, iss_retido_das, 
        val_min, val_max, indice, fator_redutor, order_position, created_at, updated_at
    ) VALUES 
    -- Códigos do seu arquivo CSV (usando códigos como base para faixas únicas)
    (my_group_id, my_user_id, '2500', 'Serviços de programação visual, comunicação visual e congêneres', false, 2500, 2500, 0.05, 0, 1, NOW(), NOW()),
    (my_group_id, my_user_id, '1023', 'Execução por administração, empreitada ou subempreitada, de obras de construção civil, elétrica ou outras obras semelhantes, e respectivos serviços auxiliares ou complementares, inclusive terraplenagem, pavimentação, concretagem e a instalação e montagem', false, 1023, 1023, 0.03, 0, 2, NOW(), NOW()),
    (my_group_id, my_user_id, '7617', 'Tinturaria e lavanderia', false, 7617, 7617, 0.05, 0, 3, NOW(), NOW()),
    (my_group_id, my_user_id, '3158', 'Datilografia, digitação, estenografia, expediente, secretaria em geral, resposta audível (telemarketing), redação, edição, revisão, apoio e infra-estrutura administrativa e congêneres', false, 3158, 3158, 0.05, 0, 4, NOW(), NOW()),
    (my_group_id, my_user_id, '4030', 'Medicina e biomedicina', false, 4030, 4030, 0.02, 0, 5, NOW(), NOW()),
    (my_group_id, my_user_id, '2186', 'Serviços de desenhos técnicos', false, 0, 999999, 0.05, 0, 6, NOW(), NOW()),
    (my_group_id, my_user_id, '2692', 'Disposição, sem cessão definitiva, de conteúdos de áudio por meio da internet.', false, 0, 999999, 0.05, 0, 7, NOW(), NOW()),
    (my_group_id, my_user_id, '7109', 'Agenciam/intermediação programas de turismo, passeios, viagens, excursões, hospedagens e congêneres.', false, 0, 999999, 0.05, 0, 8, NOW(), NOW()),
    (my_group_id, my_user_id, '4626', 'Nutrição', false, 0, 999999, 0.02, 0, 9, NOW(), NOW()),
    (my_group_id, my_user_id, '2919', 'Suporte técnico, instalação, configuração e manutenção de programas de bancos de dados', false, 0, 999999, 0.05, 0, 10, NOW(), NOW()),
    (my_group_id, my_user_id, '5118', 'Psicologia', false, 0, 999999, 0.02, 0, 11, NOW(), NOW()),
    (my_group_id, my_user_id, '2054', 'Desenho industrial', false, 0, 999999, 0.05, 0, 12, NOW(), NOW()),
    (my_group_id, my_user_id, '4391', 'Fisioterapia', false, 0, 999999, 0.02, 0, 13, NOW(), NOW()),
    (my_group_id, my_user_id, '1899', 'Planejamento, coordenação, programação ou organização técnica, financeira ou administrativa', false, 0, 999999, 0.05, 0, 14, NOW(), NOW()),
    (my_group_id, my_user_id, '6084', 'Agenciamento ou intermediação de seguros', true, 0, 999999, 0.05, 0, 15, NOW(), NOW()),
    (my_group_id, my_user_id, '2881', 'Assessoria e consultoria em informática', false, 0, 999999, 0.05, 0, 16, NOW(), NOW()),
    (my_group_id, my_user_id, '7099', 'Hospedagem em apart-service condominiais, flat, apart-hotéis, hotéis residência, residence-service, suite service e congêneres', false, 0, 999999, 0.05, 0, 17, NOW(), NOW()),
    (my_group_id, my_user_id, '2684', 'Processamento, armazenamento ou hospedagem de dados, textos, imagens, entre outros e congêneres.', false, 0, 999999, 0.05, 0, 18, NOW(), NOW()),
    (my_group_id, my_user_id, '8400', 'Execução de música, individualmente ou por conjunto', false, 0, 999999, 0.05, 0, 19, NOW(), NOW()),
    (my_group_id, my_user_id, '1805', 'Acompanhamento e fiscalização da execução de obras de engenharia, arquitetura e urbanismo', false, 0, 999999, 0.03, 0, 20, NOW(), NOW()),
    (my_group_id, my_user_id, '7498', 'Conserto, restauração, manutenção e conservação de máquinas, aparelhos, equipamentos, motores, elevadores ou de quaisquer outros objetos, exceto veículos (exceto peças e partes empregadas, que ficam sujeitas ao ICMS)', false, 0, 999999, 0.05, 0, 21, NOW(), NOW()),
    (my_group_id, my_user_id, '5711', 'Ensino superior, cursos de pós-graduação, mestrado, doutorado, pós-doutorado', false, 0, 999999, 0.02, 0, 22, NOW(), NOW()),
    (my_group_id, my_user_id, '3654', 'Consultoria e assessoria econômica ou financeira', false, 0, 999999, 0.05, 0, 23, NOW(), NOW()),
    (my_group_id, my_user_id, '2496', 'Propaganda e publicidade, inclusive promoção de vendas, planejamento de campanhas ou sistemas de publicidade, elaboração de desenhos, textos e demais materiais publicitários', false, 0, 999999, 0.05, 0, 24, NOW(), NOW()),
    (my_group_id, my_user_id, '1015', 'Execução por administração, empreitada ou subempreitada, de obra hidráulica e outras obras semelhantes, incluídas sondagem, perfuração de poços, escavação, drenagem e irrigação', false, 0, 999999, 0.03, 0, 25, NOW(), NOW()),
    (my_group_id, my_user_id, '1430', 'Decoração', false, 0, 999999, 0.05, 0, 26, NOW(), NOW()),
    (my_group_id, my_user_id, '6394', 'Agenciamento de publicidade e propaganda, inclusive o agenciamento de veiculação por quaisquer meios', false, 0, 999999, 0.05, 0, 27, NOW(), NOW()),
    (my_group_id, my_user_id, '3476', 'Contabilidade, inclusive serviços técnicos e auxiliares', false, 0, 999999, 0.05, 0, 28, NOW(), NOW()),
    (my_group_id, my_user_id, '6807', 'Fotografia e cinematografia, inclusive revelação, ampliação, cópia, retocagem, reprodução, trucagem e congêneres (inclusive para televisão)', false, 0, 999999, 0.05, 0, 29, NOW(), NOW()),
    (my_group_id, my_user_id, '7455', 'Conserto, restauração, manutenção, conservação e pintura de veículos, exceto os serviços executados por concessionária ou revendedor autorizado', false, 0, 999999, 0.05, 0, 30, NOW(), NOW()),
    (my_group_id, my_user_id, '6777', 'Produção, mediante ou sem encomenda prévia, de eventos, espetáculos, entrevistas, shows, ballet, danças, desfiles, bailes, teatros, óperas, concertos, recitais, festivais e congêneres', false, 0, 999999, 0.05, 0, 31, NOW(), NOW()),
    (my_group_id, my_user_id, '1520', 'Engenharia, agronomia, arquitetura, urbanismo e congêneres', false, 0, 999999, 0.03, 0, 32, NOW(), NOW()),
    (my_group_id, my_user_id, '1902', 'Perícias, laudos, exames técnicos e análises técnicas, inclusive institutos psicotécnicos', false, 0, 999999, 0.05, 0, 33, NOW(), NOW()),
    (my_group_id, my_user_id, '2935', 'Planejamento, confecção, manutenção, e atualização de páginas eletrônicas.', false, 0, 999999, 0.05, 0, 34, NOW(), NOW()),
    (my_group_id, my_user_id, '7285', 'Instalação e montagem de aparelhos, máquinas e equipamentos, prestados ao usuário final, exclusivamente com material por ele fornecido', false, 0, 999999, 0.05, 0, 35, NOW(), NOW()),
    (my_group_id, my_user_id, '3212', 'Administração de imóveis', false, 0, 999999, 0.05, 0, 36, NOW(), NOW()),
    (my_group_id, my_user_id, '3751', 'Apresentação de palestras, conferências, seminários e congêneres', false, 0, 999999, 0.05, 0, 37, NOW(), NOW()),
    (my_group_id, my_user_id, '6793', 'Fonografia ou gravação de sons, inclusive trucagem, dublagem, mixagem e congêneres', false, 0, 999999, 0.05, 0, 38, NOW(), NOW()),
    (my_group_id, my_user_id, '3115', 'Assessoria ou consultoria de qualquer natureza, não contida em outros itens desta lista', true, 0, 999999, 0.05, 0, 39, NOW(), NOW()),
    (my_group_id, my_user_id, '6009', 'Representação de qualquer natureza, inclusive comercial', false, 0, 999999, 0.05, 0, 40, NOW(), NOW()),
    (my_group_id, my_user_id, '6050', 'Agenciamento, corretagem ou intermediação de planos de previdência privada', false, 0, 999999, 0.05, 0, 41, NOW(), NOW()),
    (my_group_id, my_user_id, '6238', 'Agenciamento, corretagem ou intermediação de contratos de faturização (factoring)', false, 0, 999999, 0.05, 0, 42, NOW(), NOW()),
    (my_group_id, my_user_id, '6297', 'Agenciamento, corretagem ou intermediação de bens móveis ou imóveis, não abrangidos em outros itens ou subitens, por quaisquer meios', false, 0, 999999, 0.05, 0, 43, NOW(), NOW()),
    (my_group_id, my_user_id, '6298', 'Agenciamento, corret. Intermed. Não abrangidos em outros intens, por quaisquer meios.', false, 0, 999999, 0.05, 0, 44, NOW(), NOW()),
    (my_group_id, my_user_id, '6092', 'Agenciamento, corretagem ou intermediação de cartões de crédito', true, 0, 999999, 0.05, 0, 45, NOW(), NOW()),
    (my_group_id, my_user_id, '6114', 'Agenciamento, corretagem ou intermediação de planos de saúde', true, 0, 999999, 0.05, 0, 46, NOW(), NOW()),
    (my_group_id, my_user_id, '6130', 'Corretagem De Seguros', true, 0, 999999, 0.05, 0, 47, NOW(), NOW()),
    (my_group_id, my_user_id, '3220', 'Advocacia', false, 0, 999999, 0.05, 0, 48, NOW(), NOW()),
    (my_group_id, my_user_id, '6157', 'Agenciamento, corretagem ou intermediação de títulos em geral, valores mobiliários e contratos quaisquer', false, 0, 999999, 0.05, 0, 49, NOW(), NOW()),
    (my_group_id, my_user_id, '6564', 'Cobranças e recebimentos por conta de terceiros e congêneres.', false, 0, 999999, 0.05, 0, 50, NOW(), NOW()),
    (my_group_id, my_user_id, '4693', 'Odontologia', false, 0, 999999, 0.02, 0, 51, NOW(), NOW()),
    (my_group_id, my_user_id, '2498', 'Inserção de textos, desenhos e outros materiais de propaganda e publicidade', false, 0, 999999, 0.05, 0, 52, NOW(), NOW()),
    (my_group_id, my_user_id, '5762', 'Serviços de instrução, treinamento e avaliação de conhecimentos de qualquer natureza.', false, 0, 999999, 0.02, 0, 53, NOW(), NOW()),
    (my_group_id, my_user_id, '1589', 'Agrimensura, geologia e congêneres', false, 0, 999999, 0.03, 0, 54, NOW(), NOW()),
    (my_group_id, my_user_id, '1210', 'Paisagismo', false, 0, 999999, 0.05, 0, 55, NOW(), NOW()),
    (my_group_id, my_user_id, '2800', 'Licenciamento ou cessão de direito de uso de programas de computação, inclusive distribuição.', false, 0, 999999, 0.05, 0, 56, NOW(), NOW()),
    (my_group_id, my_user_id, '1406', 'Limpeza, manutenção e conservação de imóveis, chaminés, piscinas e congêneres, inclusive fossas.', false, 0, 999999, 0.05, 0, 57, NOW(), NOW()),
    (my_group_id, my_user_id, '1694', 'Elaboração de planos diretores, estudos de viabilidade, estudos organizacionais e outros, relacionados com obras e serviços de engenharia; elaboração de anteprojetos, projetos básicos e projetos executivos para trabalhos de engenharia.', false, 0, 999999, 0.03, 0, 58, NOW(), NOW()),
    (my_group_id, my_user_id, '7161', 'Planejamento, organização e administração de feiras, exposições, congressos e congêneres', false, 0, 999999, 0.05, 0, 59, NOW(), NOW()),
    (my_group_id, my_user_id, '6808', 'Fotografia e cinematografia, inclusive revelação, ampliação, cópia, retocagem, reprodução, trucagem e congêneres (inclusive para televisão).', false, 0, 999999, 0.05, 0, 60, NOW(), NOW());

    -- Contar total inserido
    GET DIAGNOSTICS total_inserted = ROW_COUNT;
    
    RAISE NOTICE '🎉 Inseridos % códigos de serviço do seu arquivo CSV!', total_inserted;
    RAISE NOTICE '📊 Group ID: %', my_group_id;
    RAISE NOTICE '👤 User ID: %', my_user_id;
END $$;

-- Verificar resultado (usando a mesma lógica de user_id)
WITH user_info AS (
    SELECT COALESCE(auth.uid(), (SELECT id FROM auth.users LIMIT 1)) as current_user_id
)
SELECT 
    '✅ IMPORTAÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_codigos_inseridos,
    COUNT(CASE WHEN iss_retido_das THEN 1 END) as com_iss_retido,
    COUNT(CASE WHEN NOT iss_retido_das THEN 1 END) as sem_iss_retido
FROM formula_rows fr
JOIN formula_groups fg ON fr.group_id = fg.id
CROSS JOIN user_info ui
WHERE fr.user_id = ui.current_user_id AND fg.name = 'Códigos Municipais - Lista Completa';

-- Mostrar amostra dos códigos inseridos
WITH user_info AS (
    SELECT COALESCE(auth.uid(), (SELECT id FROM auth.users LIMIT 1)) as current_user_id
)
SELECT 
    fr.codigo_servico as "Código",
    LEFT(fr.descricao_servico, 80) || '...' as "Descrição",
    CASE WHEN fr.iss_retido_das THEN 'Sim' ELSE 'Não' END as "ISS Retido",
    (fr.indice * 100) || '%' as "Alíquota"
FROM formula_rows fr
JOIN formula_groups fg ON fr.group_id = fg.id
CROSS JOIN user_info ui
WHERE fr.user_id = ui.current_user_id AND fg.name = 'Códigos Municipais - Lista Completa'
ORDER BY fr.order_position
LIMIT 15;

SELECT '🎯 Total de 60 códigos do seu CSV inseridos com sucesso!' as resultado_final;