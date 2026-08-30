import { createActivationInvite } from '../services/adminAuthService.js';
import { pool } from '../db.js';

const labelIndex = process.argv.indexOf('--name');
const label = labelIndex >= 0 ? process.argv[labelIndex + 1] : 'Dispositivo inicial';
if (!label || label.length > 80) throw new Error('Usa --name con un nombre de hasta 80 caracteres.');
const invite = await createActivationInvite({ label });
console.log(`Enlace de activación (válido hasta ${invite.expiresAt.toISOString()}):`);
console.log(invite.activationUrl);
await pool.end();
