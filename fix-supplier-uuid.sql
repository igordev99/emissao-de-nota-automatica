-- Script para corrigir UUID automático nas tabelas Client e Supplier

-- 1. Verificar se existe a extensão uuid-ossp (necessária para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Configurar UUID automático para tabela Supplier
ALTER TABLE "Supplier" 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Configurar UUID automático para tabela Client  
ALTER TABLE "Client" 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Configurar timestamps automáticos para tabela Supplier
ALTER TABLE "Supplier" 
ALTER COLUMN "createdAt" SET DEFAULT now();

ALTER TABLE "Supplier" 
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- 5. Configurar timestamps automáticos para tabela Client
ALTER TABLE "Client" 
ALTER COLUMN "createdAt" SET DEFAULT now();

ALTER TABLE "Client" 
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- 6. Verificar configuração das tabelas
SELECT 
    'Supplier' as table_name,
    column_name, 
    column_default, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'Supplier' AND table_schema = 'public'
UNION ALL
SELECT 
    'Client' as table_name,
    column_name, 
    column_default, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'Client' AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 7. Testar criação de UUID
SELECT gen_random_uuid() as test_uuid;