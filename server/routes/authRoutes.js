import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { activateDevice, AuthError, findSession, revokeCurrentDevice } from '../services/adminAuthService.js';
import { cookieOptions, csrfTokenForSession } from '../security/tokens.js';
import { requireSession } from '../middlewares/adminAuth.js';

const router = Router();
const activationLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/session', async (req, res, next) => {
  try {
    const rawToken = req.cookies[config.sessionCookieName];
    const session = await findSession(rawToken);
    if (!session) return res.json({ authenticated: false, role: 'CUSTOMER' });
    return res.json({
      authenticated: true,
      role: 'ADMIN',
      device: { id: session.device_id, name: session.device_name },
      csrfToken: csrfTokenForSession(rawToken),
      expiresAt: session.expires_at
    });
  } catch (error) { return next(error); }
});

router.post('/activate', activationLimiter, async (req, res, next) => {
  try {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    const deviceName = typeof req.body.deviceName === 'string' ? req.body.deviceName.trim() : '';
    if (!token || deviceName.length > 80) throw new AuthError('INVALID_ACTIVATION_REQUEST', 'Datos de activación inválidos.');
    const result = await activateDevice({ token, deviceName, userAgent: req.get('user-agent') || '' });
    res.cookie(config.sessionCookieName, result.sessionToken, cookieOptions());
    return res.status(201).json({ authenticated: true, role: 'ADMIN', deviceId: result.deviceId, expiresAt: result.expiresAt });
  } catch (error) { return next(error); }
});

router.post('/logout', requireSession, async (req, res, next) => {
  try {
    await revokeCurrentDevice(req.adminSession.device_id);
    res.clearCookie(config.sessionCookieName, cookieOptions());
    return res.status(204).end();
  } catch (error) { return next(error); }
});

export default router;
