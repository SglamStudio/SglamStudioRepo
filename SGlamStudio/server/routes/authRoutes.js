import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { requireAdmin, requireSession } from '../middlewares/adminAuth.js';
import { clearCookieOptions, cookieOptions, csrfTokenForSession } from '../security/tokens.js';
import { activateDevice, findSession, revokeCurrentSession } from '../services/adminAuthService.js';

const router = Router();
const activationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const activationSchema = z.object({
  token: z.string().trim().min(32).max(180),
  deviceName: z.string().trim().min(1).max(120),
});

router.get('/session', async (req, res, next) => {
  try {
    const rawToken = req.cookies[config.sessionCookieName];
    const session = await findSession(rawToken);
    if (!session) return res.json({ authenticated: false, role: 'CUSTOMER' });
    return res.json({
      authenticated: true,
      role: session.role,
      device: { id: session.device_id, name: session.device_name },
      csrfToken: csrfTokenForSession(rawToken),
      expiresAt: session.expires_at,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/activate', activationLimiter, async (req, res, next) => {
  try {
    const payload = activationSchema.parse(req.body);
    const result = await activateDevice({
      ...payload,
      userAgent: req.get('user-agent') || '',
    });
    res.cookie(config.sessionCookieName, result.sessionToken, cookieOptions());
    return res.status(201).json({
      authenticated: true,
      role: result.role,
      deviceId: result.deviceId,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', requireSession, requireAdmin, async (req, res, next) => {
  try {
    await revokeCurrentSession(req.adminSession.session_id);
    res.clearCookie(config.sessionCookieName, clearCookieOptions());
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export { activationSchema };
export default router;
