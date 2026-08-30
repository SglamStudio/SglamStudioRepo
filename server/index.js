import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config.js';
import { pool } from './db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { handleAuthError } from './middlewares/adminAuth.js';

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); return res.json({ ok: true }); }
  catch { return res.status(503).json({ ok: false }); }
});

app.use(express.static(path.join(projectRoot, 'dist')));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) return res.sendFile(path.join(projectRoot, 'dist', 'index.html'));
  return next();
});

app.use(handleAuthError);
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});

const server = app.listen(config.PORT, () => console.log(`Servidor Glam Studio en http://localhost:${config.PORT}`));
process.on('SIGTERM', async () => { server.close(); await pool.end(); });
