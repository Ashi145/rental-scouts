import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './src/server/routes/authRoutes.ts';
import propertyRoutes from './src/server/routes/propertyRoutes.ts';
import paymentRoutes from './src/server/routes/paymentRoutes.ts';
import landlordRoutes from './src/server/routes/landlordRoutes.ts';
import adminRoutes from './src/server/routes/adminRoutes.ts';
import reportRoutes from './src/server/routes/reportRoutes.ts';
import notificationRoutes from './src/server/routes/notificationRoutes.ts';
import { securityHeadersMiddleware, errorHandlerMiddleware } from './src/server/middleware/securityMiddleware.ts';
import { rateLimit } from './src/server/middleware/rateLimitMiddleware.ts';
import { assertSecuritySecrets } from './src/server/auth/authService.ts';
import { authMiddleware } from './src/server/middleware/authMiddleware.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp(options: { serveFrontend?: boolean } = {}) {
  assertSecuritySecrets();
  const app = express();
  app.disable('x-powered-by');
  const isProd = process.env.NODE_ENV === 'production';

  // Security & parsing
  app.use(securityHeadersMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Populate req.user consistently for every API router; route-level guards enforce access.
  app.use('/api', authMiddleware);

  // Static uploads directory (if any)
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Rate Limiting
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 60, message: 'Too many authentication attempts.', keyPrefix: 'auth' });
  const paymentLimiter = rateLimit({ windowMs: 5 * 60 * 1000, maxRequests: 30, message: 'Too many payment requests.', keyPrefix: 'pay' });

  // API Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/payments', paymentLimiter, paymentRoutes);
  app.use('/api/landlord', landlordRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'Rental Scout Uganda',
      currency: 'UGX',
      unlockFee: 5000,
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware in dev or static serving in prod
  if (options.serveFrontend !== false && !isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (options.serveFrontend !== false) {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handling
  app.use(errorHandlerMiddleware);

  return app;
}

async function startServer() {
  const app = await createApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Rental Scout] Server running at http://0.0.0.0:${PORT}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
