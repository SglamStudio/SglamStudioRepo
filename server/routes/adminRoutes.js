import { Router } from 'express';
import { z } from 'zod';
import { createActivationInvite, listDevices, revokeDevice } from '../services/adminAuthService.js';
import { requireAdmin, requireSession } from '../middlewares/adminAuth.js';

const router = Router();
const inviteSchema = z.object({ label: z.string().trim().min(1).max(80) });

router.use(requireSession, requireAdmin);

router.get('/devices', async (req, res, next) => {
  try {
    const devices = await listDevices();
    return res.json({ devices: devices.map((device) => ({ ...device, current: device.id === req.adminSession.device_id })) });
  } catch (error) { return next(error); }
});

router.post('/activation-tokens', async (req, res, next) => {
  try {
    const { label } = inviteSchema.parse(req.body);
    const invite = await createActivationInvite({ label, createdByDeviceId: req.adminSession.device_id });
    return res.status(201).json(invite);
  } catch (error) { return next(error); }
});

router.delete('/devices/:id', async (req, res, next) => {
  try {
    const revoked = await revokeDevice(req.params.id);
    return revoked ? res.status(204).end() : res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
  } catch (error) { return next(error); }
});

export default router;
