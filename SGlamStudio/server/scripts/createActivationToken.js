function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const label = readArgument('--name') ?? 'Dispositivo inicial';
if (!label || label.length > 80) throw new Error('Usa --name con un nombre de hasta 80 caracteres.');

const originValue = readArgument('--origin');
if (process.argv.includes('--origin') && !originValue) {
  throw new Error('Usa --origin seguido del dominio público, por ejemplo https://glam-studio.vercel.app.');
}
if (originValue) {
  const origin = new URL(originValue);
  const isLocal = ['localhost', '127.0.0.1'].includes(origin.hostname);
  if (origin.protocol !== 'https:' && !isLocal) {
    throw new Error('El dominio público de --origin debe usar HTTPS.');
  }
  process.env.APP_ORIGIN = origin.origin;
}

// Las importaciones son dinámicas para aplicar --origin antes de cargar config.js.
const [{ createActivationInvite }, { pool }] = await Promise.all([
  import('../services/adminAuthService.js'),
  import('../db.js')
]);

try {
  const invite = await createActivationInvite({ label });
  console.log(`Enlace de activación (válido hasta ${invite.expiresAt.toISOString()}):`);
  console.log(invite.activationUrl);
} finally {
  await pool.end();
}
