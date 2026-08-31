const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Auto-load .env if present
try {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  }
} catch (e) {}

// Master Secret Key for AES-256 encryption
// 32-byte secret key derived with SHA-256
const SECRET_KEY = crypto.createHash('sha256').update(process.env.POS_ENCRYPTION_SECRET || 'ROYAL_FASHION_BILLBOOK_SECURE_KEY_2026').digest();
const ALGORITHM = 'aes-256-cbc';
const ENC_PREFIX = 'ENC::';

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text 
 * @returns {string} Encrypted prefixed string
 */
function encrypt(text) {
  if (text === null || text === undefined || text === '') return text;
  const str = String(text);
  if (str.startsWith(ENC_PREFIX)) return str; // Already encrypted

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(str, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${ENC_PREFIX}${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return str;
  }
}

/**
 * Decrypt an AES-256-CBC encrypted string
 * @param {string} cipherText 
 * @returns {string} Plaintext decrypted string
 */
function decrypt(cipherText) {
  if (cipherText === null || cipherText === undefined || cipherText === '') return cipherText;
  const str = String(cipherText);
  if (!str.startsWith(ENC_PREFIX)) return str; // Plaintext or unencrypted

  try {
    const payload = str.slice(ENC_PREFIX.length);
    const [ivHex, encryptedHex] = payload.split(':');
    if (!ivHex || !encryptedHex) return str;

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return str;
  }
}

/**
 * Helper to encrypt an object's specified fields
 */
function encryptFields(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = { ...obj };
  fields.forEach((f) => {
    if (clone[f] !== undefined && clone[f] !== null) {
      clone[f] = encrypt(clone[f]);
    }
  });
  return clone;
}

/**
 * Helper to decrypt an object's specified fields
 */
function decryptFields(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = { ...obj };
  fields.forEach((f) => {
    if (clone[f] !== undefined && clone[f] !== null) {
      clone[f] = decrypt(clone[f]);
    }
  });
  return clone;
}

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
};
