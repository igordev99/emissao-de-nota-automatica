-- Add column for encrypted signed XML
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "xmlSignedEncrypted" TEXT;