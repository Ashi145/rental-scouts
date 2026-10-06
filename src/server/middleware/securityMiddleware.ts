import { Request, Response, NextFunction } from 'express';

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  // Production HSTS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

// Global safe error handler (Requirement #27: Never expose stack traces or DB errors to users)
export function errorHandlerMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('[SERVER ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected system error occurred. Our technical team has been notified.',
  });
}
