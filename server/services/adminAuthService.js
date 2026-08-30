import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { pool, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import { activationUrl, createOpaqueToken, csrfTokenForSession, hashToken } from '../security/tokens.js';

export class AuthError extends AppError {
  constructor(code, message = code, status = 400) {
    super(status, code, message);
    this.name = 'AuthError';
  }
}

export async function createActivationInvite({ label, createdByDeviceId = null }) {
  const token = createOpaqueToken(32);
  const expiresAt = new Date(Date.now() + config.ACTIVATION_TOKEN_MINUTES * 60 * 1000);
  await pool.query(
    `INSERT INTO activation_tokens
      (id, token_hash, label, role, created_by_device_id, expires_at)
     VALUES ($1, $2, $3, 'ADMIN', $4, $5)`,
    [randomUUID(), hashToken(token), label, createdByDeviceId, expiresAt]
  );
  return { token, activationUrl: activationUrl(token), expiresAt };
}

export async function activateDevice({ token, deviceName, userAgent }) {
  const sessionToken = createOpaqueToken(32);
  const deviceId = randomUUID();
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + config.ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000);

  await withTransaction(async (client) => {
    const invite = await client.query(
      `SELECT id, label, role FROM activation_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > NOW()
       FOR UPDATE`,
      [hashToken(token)]
    );
    if (invite.rowCount !== 1) {
      throw new AuthError('INVALID_ACTIVATION_TOKEN', 'El enlace no es válido, ya fue usado o venció.');
    }

    const row = invite.rows[0];
    const name = (deviceName || row.label || 'Dispositivo administrador').slice(0, 120);
    await client.query(
      `INSERT INTO admin_devices (id, name, role, user_agent, last_seen_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [deviceId, name, row.role, userAgent.slice(0, 500)]
    );
    await client.query(
      `INSERT INTO admin_sessions
        (id, device_id, token_hash, csrf_secret, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, deviceId, hashToken(sessionToken), hashToken(createOpaqueToken(24)), expiresAt]
    );
    await client.query(
      `UPDATE activation_tokens
       SET used_at = NOW(), used_by_device_id = $2
       WHERE id = $1`,
      [row.id, deviceId]
    );
  });

  return {
    sessionToken,
    csrfToken: csrfTokenForSession(sessionToken),
    deviceId,
    expiresAt,
    role: 'ADMIN',
  };
}

export async function findSession(sessionToken) {
  if (!sessionToken) return null;
  const result = await pool.query(
    `SELECT
       s.id AS session_id,
       s.device_id,
       s.expires_at,
       d.name AS device_name,
       d.role
     FROM admin_sessions s
     JOIN admin_devices d ON d.id = s.device_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND d.revoked_at IS NULL
       AND s.expires_at > NOW()`,
    [hashToken(sessionToken)]
  );
  if (result.rowCount !== 1) return null;

  const session = result.rows[0];
  await pool.query(
    `UPDATE admin_sessions SET last_seen_at = NOW() WHERE id = $1`,
    [session.session_id]
  );
  await pool.query(
    `UPDATE admin_devices SET last_seen_at = NOW() WHERE id = $1`,
    [session.device_id]
  );
  return session;
}

export async function listDevices() {
  const result = await pool.query(
    `SELECT id, name, role, user_agent, activated_at, last_seen_at, revoked_at
     FROM admin_devices
     ORDER BY activated_at DESC`
  );
  return result.rows;
}

export async function revokeDevice(deviceId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE admin_devices
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE id = $1
       RETURNING id`,
      [deviceId]
    );
    if (!result.rowCount) return false;
    await client.query(
      `UPDATE admin_sessions
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE device_id = $1`,
      [deviceId]
    );
    return true;
  });
}

export async function revokeCurrentSession(sessionId) {
  await pool.query(
    `UPDATE admin_sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE id = $1`,
    [sessionId]
  );
}
