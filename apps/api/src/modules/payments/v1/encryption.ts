import crypto from 'crypto';

const PAYMENT_CONFIG_ENC_KEY = process.env.PAYMENT_CONFIG_ENC_KEY;

if (!PAYMENT_CONFIG_ENC_KEY) {
  console.warn(
    '⚠️  PAYMENT_CONFIG_ENC_KEY not set. Payment config encryption disabled.'
  );
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a 32-byte key from the environment variable
 */
function getEncryptionKey(): Buffer {
  if (!PAYMENT_CONFIG_ENC_KEY) {
    throw new Error('PAYMENT_CONFIG_ENC_KEY environment variable not set');
  }

  // If the key is already 64 hex chars (32 bytes), use it directly
  if (PAYMENT_CONFIG_ENC_KEY.length === KEY_LENGTH * 2) {
    return Buffer.from(PAYMENT_CONFIG_ENC_KEY, 'hex');
  }

  // Otherwise, derive a key using PBKDF2
  return crypto.pbkdf2Sync(
    PAYMENT_CONFIG_ENC_KEY,
    'payment-config-salt', // Static salt for deterministic key derivation
    100000,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts payment credentials using AES-256-GCM
 * Format: iv:authTag:encryptedData (all hex-encoded)
 */
export function encryptPaymentCredentials(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts payment credentials
 */
export function decryptPaymentCredentials(encryptedText: string): string {
  const parts = encryptedText.split(':');
  
  // If not in expected format, assume it's unencrypted (for migration)
  if (parts.length !== 3) {
    console.warn('⚠️  Decrypting payment credentials in legacy format');
    return encryptedText;
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Safely redacts sensitive data for logging
 */
export function redactSecretForLogging(secret: string): string {
  if (!secret || secret.length < 8) {
    return '***';
  }
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}
