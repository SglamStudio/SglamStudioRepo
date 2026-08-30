import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { config } from './config.js';
import { pool } from './db.js';
import { AppError } from './errors.js';
import { handleAuthError } from './middlewares/adminAuth.js';
import adminCatalogRoutes from './routes/adminCatalogRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(express.json({ limit: '96kb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api/admin/catalog', adminCatalogRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/catalog', catalogRoutes);

  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      return res.json({ ok: true });
    } catch {
      return res.status(503).json({ ok: false });
    }
  });

  app.use(express.static(path.join(projectRoot, 'public')));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      return res.sendFile(path.join(projectRoot, 'public', 'index.html'));
    }
    return next();
  });
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'NOT_FOUND' });
    return next();
  });

  app.use(handleAuthError);
  app.use((error, req, res, next) => {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'INVALID_REQUEST', details: error.issues });
    }
    if (error instanceof AppError) {
      return res.status(error.status).json({
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'DUPLICATE_RESOURCE', message: 'Ese registro ya existe.' });
    }
    if (error?.code === '23503') {
      return res.status(409).json({ error: 'RESOURCE_IN_USE', message: 'El registro todavía está en uso.' });
    }
    console.error(error);
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Ocurrió un error interno.' });
  });

  return app;
}

export function startServer() {
  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`Servidor Glam Studio en http://localhost:${config.PORT}`);
  });
  const close = async () => {
    server.close();
    await pool.end();
  };
  process.once('SIGTERM', close);
  process.once('SIGINT', close);
  return server;
}

const entryPoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entryPoint) startServer();
