-- Add payloadHash to IdempotencyKey table
-- This migration aligns the database with the Prisma schema changes

-- Only add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'IdempotencyKey'
                   AND column_name = 'payloadHash'
                   AND table_schema = 'public') THEN
        ALTER TABLE "IdempotencyKey" ADD COLUMN "payloadHash" TEXT NULL;
    END IF;
END $$;