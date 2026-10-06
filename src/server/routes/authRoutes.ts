import { Router, Response } from 'express';
import { db, hashPassword, isModernPasswordHash, verifyPassword } from '../db/database.ts';
import { generateToken, revokeToken, sanitizeUser, validatePasswordStrength, normalizeUgandanPhone, isValidUgandanPhone } from '../auth/authService.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

// Register new user (Tenant or Landlord)
router.post('/register', (req, res) => {
  try {
    const { email, password, fullName, phone, role, landlordRole, secondaryPhone, businessName } = req.body;

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (role !== 'TENANT' && role !== 'LANDLORD') {
      return res.status(400).json({ error: 'Role must be either TENANT or LANDLORD.' });
    }

    if (!isValidUgandanPhone(phone)) {
      return res.status(400).json({ error: 'Please provide a valid Ugandan phone number (e.g. 0772 123 456 or +2567...).' });
    }

    let normalizedSecondary = '';
    if (secondaryPhone && secondaryPhone.trim()) {
      if (!isValidUgandanPhone(secondaryPhone)) {
        return res.status(400).json({ error: 'Invalid secondary phone number format.' });
      }
      normalizedSecondary = normalizeUgandanPhone(secondaryPhone);
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.message });
    }

    const normalizedPhone = normalizeUgandanPhone(phone);
    const passwordHash = hashPassword(password);

    const newUser = db.createUser(
      {
        email,
        passwordHash,
        fullName: fullName.trim(),
        phone: normalizedPhone,
        role,
      },
      role === 'LANDLORD'
        ? {
            landlordRole,
            secondaryPhone: normalizedSecondary,
            businessName: businessName?.trim(),
          }
        : undefined
    );

    const token = generateToken(newUser);

    // Set secure HTTP-only cookie
    res.cookie('rental_scout_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    db.recordAuditLog({
      actorUserId: newUser.id,
      actorEmail: newUser.email,
      actorRole: newUser.role,
      action: 'USER_REGISTERED',
      targetType: 'USER',
      targetId: newUser.id,
      details: { role: newUser.role },
    });

    return res.status(201).json({ user: sanitizeUser(newUser) });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    if (!isModernPasswordHash(user.passwordHash)) {
      db.updateUser(user.id, { passwordHash: hashPassword(password) });
    }
    db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    const token = generateToken(user);

    res.cookie('rental_scout_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    db.recordAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'USER_LOGIN',
      targetType: 'USER',
      targetId: user.id,
    });

    return res.json({ user: sanitizeUser(user) });
  } catch (err: unknown) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  const token = req.cookies?.rental_scout_token;
  if (token) revokeToken(token);
  res.clearCookie('rental_scout_token');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Current User Profile
router.get('/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  const landlordProfile = req.user.role === 'LANDLORD'
    ? db.getLandlordProfileByUserId(req.user.id)
    : undefined;

  return res.json({
    user: sanitizeUser(req.user),
    landlordProfile,
  });
});

export default router;
