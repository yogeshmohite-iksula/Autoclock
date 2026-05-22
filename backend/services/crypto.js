// crypto.js — AES-256-GCM token encryption. DevDoc §6.6 / ERD §14.4.
// Format: "iv:authTag:ciphertext", each base64. No key rotation in M0 —
// if TOKEN_ENC_KEY is lost, all users simply reconnect.

const crypto = require('crypto');

const ALG = 'aes-256-gcm';
const KEY_HEX = process.env.TOKEN_ENC_KEY;

function loadKey() {
  if (!KEY_HEX) throw new Error('TOKEN_ENC_KEY env not set');
  // Accept 32-byte hex (64 chars) OR 16-byte hex (32 chars, expand via SHA-256).
  if (/^[0-9a-fA-F]{64}$/.test(KEY_HEX)) return Buffer.from(KEY_HEX, 'hex');
  if (/^[0-9a-fA-F]{32}$/.test(KEY_HEX)) return crypto.createHash('sha256').update(Buffer.from(KEY_HEX, 'hex')).digest();
  // Fallback: hash whatever was provided to 32 bytes (dev convenience).
  return crypto.createHash('sha256').update(KEY_HEX, 'utf8').digest();
}

function encrypt(plaintext) {
  const key = loadKey();
  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ct].map(b => b.toString('base64')).join(':');
}

function decrypt(blob) {
  const key = loadKey();
  const parts = String(blob).split(':');
  if (parts.length !== 3) throw new Error('Bad ciphertext format — expected iv:authTag:ciphertext');
  const [iv, tag, ct] = parts.map(p => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
