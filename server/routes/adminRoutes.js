import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { requireAdmin, requireSession } from '../middlewares/adminAuth.js';
import { clearCookieOptions } from '../security/tokens.js';
import { createActivationInvite, listDevices, revokeDevice } from '../services/adminAuthService.js';

const router = Router();
const uuid = z.string().uuid();
const inviteSchema = z.object({ label: z.string().trim().min(1).max(120) });

router.use(requireSession, requireAdmin);

router.get('/devices', async (req, res, next) => {
  try {
    const devices = await listDevices();
    return res.json({
      devices: devices.map((device) => ({
        id: device.id,
        name: device.name,
        role: device.role,
        activatedAt: device.activated_at,
        lastSeenAt: device.last_seen_at,
        revokedAt: device.revoked_at,
        current: device.id === req.adminSession.device_id,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/activation-tokens', async (req, res, next) => {
  try {
    const { label } = inviteSchema.parse(req.body);
    const invite = await createActivationInvite({
      label,
      createdByDeviceId: req.adminSession.device_id,
    });
    return res.status(201).json({ activationUrl: invite.activationUrl, expiresAt: invite.expiresAt });
  } catch (error) {
    return next(error);
  }
});

router.delete('/devices/:id', async (req, res, next) => {
  try {
    const deviceId = uuid.parse(req.params.id);
    const revoked = await revokeDevice(deviceId);
    if (!revoked) return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    if (deviceId === req.adminSession.device_id) {
      res.clearCookie(config.sessionCookieName, clearCookieOptions());
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export { inviteSchema };
export default router;
