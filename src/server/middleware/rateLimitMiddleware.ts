import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitStore>();

// Cleanup stale keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of memoryStore.entries()) {
    if (now > val.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 300000);

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${options.keyPrefix || 'rl'}:${ip}`;
    const now = Date.now();

    const record = memoryStore.get(key);

    if (!record || now > record.resetAt) {
      memoryStore.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests. Please slow down and try again later.',
      });
    }

    record.count += 1;
    next();
  };
}
