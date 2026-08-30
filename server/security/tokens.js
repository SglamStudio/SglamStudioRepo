import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function csrfTokenForSession(sessionToken) {
  return createHmac('sha256', config.CSRF_SECRET).update(sessionToken).digest('base64url');
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: config.ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000
  };
}

export function clearCookieOptions() {
  const { maxAge, ...options } = cookieOptions();
  return options;
}

export function activationUrl(token) {
  return `${config.APP_ORIGIN}/#admin-activate=${encodeURIComponent(token)}`;
}
