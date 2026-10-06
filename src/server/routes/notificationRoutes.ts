import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

router.use(requireAuth);

// GET User Notifications
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const notifications = db.getNotificationsByUser(req.user!.id);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  return res.json({ notifications, unreadCount });
});

// PATCH Mark as Read
router.patch('/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const success = db.markNotificationAsRead(req.params.id, req.user!.id);
  return res.json({ success });
});

export default router;
