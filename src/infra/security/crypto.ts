import crypto from 'crypto';

const ENC_ALGO = 'aes-256-gcm';

export function hasEncryptionKey() {
  return !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32;
}

function getKey() {
  if (!hasEncryptionKey()) throw new Error('ENCRYPTION_KEY not set or too short');
  // Deriva chave de 32 bytes via hash (permite chave textual maior/menor)
  return crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY as string).digest();
}

export interface EncryptedPayload {
  v: number; // versão
  iv: string;
  tag: string;
  data: string;
}

export function encryptBase64(b64: string): EncryptedPayload {
  if (!hasEncryptionKey()) return { v: 0, iv: '', tag: '', data: b64 };
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(b64, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { v: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') };
}

export function decryptToBase64(obj: EncryptedPayload): string {
  if (!hasEncryptionKey() || obj.v === 0) return obj.data;
  const key = getKey();
  const iv = Buffer.from(obj.iv, 'base64');
  const tag = Buffer.from(obj.tag, 'base64');
  const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(obj.data, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}

export function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
