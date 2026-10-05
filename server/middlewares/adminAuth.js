import { config } from '../config.js';
import { findSession, AuthError } from '../services/adminAuthService.js';
import { csrfTokenForSession, safeEqual } from '../security/tokens.js';

export async function requireSession(req, res, next) {
  try {
    const session = await findSession(req.cookies[config.sessionCookieName]);
    if (!session) return res.status(401).json({ error: 'UNAUTHENTICATED' });
    req.adminSession = session;
    req.rawAdminSessionToken = req.cookies[config.sessionCookieName];
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (!req.adminSession) return res.status(401).json({ error: 'UNAUTHENTICATED' });
  if (req.adminSession.role !== 'ADMIN') return res.status(403).json({ error: 'FORBIDDEN' });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const supplied = req.get('X-CSRF-Token');
    const expected = csrfTokenForSession(req.rawAdminSessionToken);
    if (!supplied || !safeEqual(supplied, expected)) return res.status(403).json({ error: 'INVALID_CSRF_TOKEN' });
  }
  return next();
}

export function handleAuthError(error, req, res, next) {
  if (error instanceof AuthError) return res.status(error.status).json({ error: error.code, message: error.message });
  return next(error);
}
