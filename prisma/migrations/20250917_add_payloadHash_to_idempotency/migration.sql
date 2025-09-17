-- Add payloadHash to IdempotencyKey table
-- This migration aligns the database with the Prisma schema changes

ALTER TABLE "IdempotencyKey" ADD COLUMN "payloadHash" TEXT NULL;