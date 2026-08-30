import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { pool, withTransaction } from '../db.js';
import { activationUrl, createOpaqueToken, csrfTokenForSession, hashToken } from '../security/tokens.js';

export class AuthError extends Error {
  constructor(code, message = code) {
    super(message);
    this.code = code;
  }
}

export async function createActivationInvite({ label, createdByDeviceId = null }) {
  const token = createOpaqueToken(32);
  const expiresAt = new Date(Date.now() + config.ACTIVATION_TOKEN_MINUTES * 60 * 1000);
  await pool.query(
    `INSERT INTO activation_tokens (id, token_hash, label, created_by_device_id, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), hashToken(token), label, createdByDeviceId, expiresAt]
  );
  return { token, activationUrl: activationUrl(token), expiresAt };
}

export async function activateDevice({ token, deviceName, userAgent }) {
  const tokenHash = hashToken(token);
  const sessionToken = createOpaqueToken(32);
  const sessionHash = hashToken(sessionToken);
  const deviceId = randomUUID();
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + config.ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000);

  await withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, label FROM activation_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );
    if (result.rowCount !== 1) throw new AuthError('INVALID_ACTIVATION_TOKEN', 'El enlace no es válido o ya venció.');
    const label = deviceName || result.rows[0].label;
    await client.query(
      `INSERT INTO admin_devices (id, name) VALUES ($1, $2)`,
      [deviceId, label.slice(0, 80)]
    );
    await client.query(
      `INSERT INTO admin_sessions (id, device_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [sessionId, deviceId, sessionHash, expiresAt]
    );
    await client.query(`UPDATE activation_tokens SET used_at = NOW() WHERE id = $1`, [result.rows[0].id]);
  });

  return { sessionToken, csrfToken: csrfTokenForSession(sessionToken), deviceId, expiresAt, userAgent };
}

export async function findSession(sessionToken) {
  if (!sessionToken) return null;
  const result = await pool.query(
    `SELECT s.id AS session_id, s.device_id, s.expires_at, d.name AS device_name
     FROM admin_sessions s JOIN admin_devices d ON d.id = s.device_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND d.revoked_at IS NULL AND s.expires_at > NOW()`,
    [hashToken(sessionToken)]
  );
  if (result.rowCount !== 1) return null;
  const session = result.rows[0];
  await pool.query(`UPDATE admin_sessions SET last_seen_at = NOW() WHERE id = $1`, [session.session_id]);
  await pool.query(`UPDATE admin_devices SET last_seen_at = NOW() WHERE id = $1`, [session.device_id]);
  return session;
}

export async function listDevices() {
  const result = await pool.query(
    `SELECT id, name, created_at, last_seen_at, revoked_at
     FROM admin_devices ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function revokeDevice(deviceId) {
  const result = await pool.query(
    `UPDATE admin_devices SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL RETURNING id`,
    [deviceId]
  );
  return result.rowCount === 1;
}

export async function revokeCurrentDevice(deviceId) {
  await pool.query(`UPDATE admin_devices SET revoked_at = NOW() WHERE id = $1`, [deviceId]);
}
