import crypto from 'crypto';
import { User, UserRole } from '../db/schema.ts';
import { db, hashPassword, verifyPassword } from '../db/database.ts';

export function assertSecuritySecrets(): void {
  if (process.env.NODE_ENV === 'test') return;
  for (const name of ['AUTH_SECRET', 'LOCATION_FUZZ_SECRET']) {
    const value = process.env[name];
    if (!value || value.length < 32 || /replace|placeholder|example/i.test(value)) {
      throw new Error(`${name} must be configured with at least 32 non-placeholder characters.`);
    }
  }
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

export function generateToken(user: User): string {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.createSession(user.id, tokenHash, expiresAt);
  return token;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = db.findSessionByTokenHash(tokenHash);
    if (!session) return null;
    const user = db.findUserById(session.userId);
    if (!user || !user.isActive) return null;
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.parse(session.expiresAt),
    };
  } catch {
    return null;
  }
}

export function revokeToken(token: string): void {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = db.findSessionByTokenHash(tokenHash);
  if (session) db.revokeSession(session.id);
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  return { valid: true };
}

export function isValidUgandanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  // Valid patterns:
  // 07XXXXXXXX (10 digits starting with 07)
  // 2567XXXXXXXX (12 digits starting with 2567)
  // 7XXXXXXXX (9 digits starting with 7)
  const regex = /^(?:256|0)?(7\d{8})$/;
  return regex.test(cleaned);
}

export function normalizeUgandanPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  const match = cleaned.match(/^(?:256|0)?(7\d{8})$/);
  if (match) {
    return `+256${match[1]}`;
  }
  // Fallback if already starts with other digits
  if (cleaned.startsWith('0')) {
    return `+256${cleaned.substring(1)}`;
  } else if (!cleaned.startsWith('256')) {
    return `+256${cleaned}`;
  }
  return `+${cleaned}`;
}

export function getUgandanWhatsAppDigits(phone: string): string {
  const normalized = normalizeUgandanPhone(phone);
  return normalized.replace(/\+/g, '');
}

export function generateCallUrl(phone: string): string {
  const normalized = normalizeUgandanPhone(phone);
  return `tel:${normalized}`;
}

export function generateWhatsAppUrl(phone: string, message?: string): string {
  const digits = getUgandanWhatsAppDigits(phone);
  const base = `https://wa.me/${digits}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}
