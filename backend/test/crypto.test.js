// crypto.test.js — unit tests for services/crypto.js (AES-256-GCM, FR-19)
// and integration tests for db/queries.js user_connections encrypt/decrypt round-trips.
// Node 18 built-in runner. No extra deps.

process.env.TOKEN_ENC_KEY = '0'.repeat(64); // 32 zero-bytes — deterministic test key
process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';
process.env.ENABLE_CRON    = 'false';

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const { encrypt, decrypt } = require('../services/crypto');

// ── pure crypto ───────────────────────────────────────────────────────────

test('encrypt → decrypt round-trips plaintext', () => {
  const plain = 'my-access-token-value';
  assert.equal(decrypt(encrypt(plain)), plain);
});

test('ciphertext does not contain plaintext', () => {
  const plain = 'my-secret-token';
  const blob  = encrypt(plain);
  assert.ok(!blob.includes(plain), 'plaintext must not appear in ciphertext blob');
});

test('ciphertext has iv:authTag:ciphertext format (three base64 segments)', () => {
  const blob = encrypt('something');
  const parts = blob.split(':');
  assert.equal(parts.length, 3, 'must have exactly 3 colon-separated parts');
  for (const p of parts) {
    assert.ok(p.length > 0, 'each part must be non-empty');
    assert.doesNotThrow(() => Buffer.from(p, 'base64'), 'each part must be valid base64');
  }
});

test('two encryptions of the same value produce different ciphertexts (random IV)', () => {
  const plain = 'same-value';
  assert.notEqual(encrypt(plain), encrypt(plain), 'IVs must differ between calls');
});

test('decrypt throws on tampered auth tag (GCM integrity check)', () => {
  const blob = encrypt('original');
  const [iv, tag, ct] = blob.split(':');
  const tagBytes = Buffer.from(tag, 'base64');
  tagBytes[tagBytes.length - 1] ^= 0xff; // flip one byte
  const tampered = `${iv}:${tagBytes.toString('base64')}:${ct}`;
  assert.throws(
    () => decrypt(tampered),
    /Unsupported state|bad decrypt|auth tag|authentication/i,
    'tampered auth tag must throw'
  );
});

test('decrypt throws on wrong format (fewer than 3 segments)', () => {
  assert.throws(
    () => decrypt('not-valid'),
    /Bad ciphertext format/,
    'malformed blob must throw'
  );
});

test('decrypt throws on ciphertext from a different key (GCM auth tag mismatch)', () => {
  // Build a valid blob manually with a different AES-GCM key (not TOKEN_ENC_KEY).
  const crypto = require('crypto');
  const otherKey  = crypto.randomBytes(32);
  const iv        = crypto.randomBytes(12);
  const cipher    = crypto.createCipheriv('aes-256-gcm', otherKey, iv);
  const ct        = Buffer.concat([cipher.update('secret', 'utf8'), cipher.final()]);
  const tag       = cipher.getAuthTag();
  // This blob was encrypted with a different key than TOKEN_ENC_KEY, so decrypt() will
  // fail the GCM auth-tag check.
  const blob = [iv, tag, ct].map(b => b.toString('base64')).join(':');
  assert.throws(
    () => decrypt(blob),
    /Unsupported state|bad decrypt|auth tag|authentication/i,
    'ciphertext from wrong key must fail GCM auth-tag check'
  );
});

// ── queries integration ───────────────────────────────────────────────────

test('upsertConnection + getConnection: tokens round-trip transparently', () => {
  const Q = require('../db/queries');
  const userId = 1; // yogesh@iksula.com seeded with id=1

  Q.upsertConnection(userId, 'jira', {
    access_token:  'test-access-abc',
    refresh_token: 'test-refresh-xyz',
    expires_at:    '2099-01-01T00:00:00Z',
    scope:         'read:jira-work write:jira-work',
  });

  const conn = Q.getConnection(userId, 'jira');
  assert.equal(conn.access_token,  'test-access-abc',  'access_token round-trips');
  assert.equal(conn.refresh_token, 'test-refresh-xyz', 'refresh_token round-trips');
  assert.equal(conn.provider,  'jira');
  assert.equal(conn.scope, 'read:jira-work write:jira-work');

  // Raw stored columns must be ciphertext, NOT the original plaintext
  assert.notEqual(conn.access_token_enc,  'test-access-abc');
  assert.notEqual(conn.refresh_token_enc, 'test-refresh-xyz');
  assert.ok(conn.access_token_enc.includes(':'),  'access_token_enc must be iv:tag:ct');
  assert.ok(conn.refresh_token_enc.includes(':'), 'refresh_token_enc must be iv:tag:ct');

  Q.deleteConnection(userId, 'jira');
  assert.equal(Q.getConnection(userId, 'jira'), null, 'deleteConnection removes the row');
});

test('upsertConnection with no refresh_token stores null refresh_token_enc', () => {
  const Q = require('../db/queries');
  const userId = 1;

  Q.upsertConnection(userId, 'google', { access_token: 'access-only' });
  const conn = Q.getConnection(userId, 'google');
  assert.equal(conn.access_token,  'access-only');
  assert.equal(conn.refresh_token, null, 'refresh_token is null when not provided');

  Q.deleteConnection(userId, 'google');
});

test('rotateToken atomically overwrites both tokens, leaves scope intact', () => {
  const Q = require('../db/queries');
  const userId = 1;

  Q.upsertConnection(userId, 'jira', {
    access_token:  'old-access',
    refresh_token: 'old-refresh',
    scope:         'read:jira-work',
  });

  Q.rotateToken(userId, 'jira', {
    access_token:  'new-access',
    refresh_token: 'new-refresh',
    expires_at:    '2099-06-01T00:00:00Z',
  });

  const conn = Q.getConnection(userId, 'jira');
  assert.equal(conn.access_token,  'new-access',  'access_token updated after rotate');
  assert.equal(conn.refresh_token, 'new-refresh', 'refresh_token updated after rotate');
  assert.equal(conn.scope, 'read:jira-work', 'scope unchanged after rotate');
  assert.equal(conn.expires_at, '2099-06-01T00:00:00Z');

  // Ciphertext changed between old and new tokens
  Q.deleteConnection(userId, 'jira');
});

test('getConnection returns null for unknown user/provider', () => {
  const Q = require('../db/queries');
  assert.equal(Q.getConnection(99999, 'jira'), null);
});
