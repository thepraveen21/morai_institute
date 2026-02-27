import { Router } from 'express';
import {
  getPortalDashboard,
  getMyFees,
  getMyAttendance,
  uploadMyProof,
  getMyAnnouncements,
  getMyReceipt
} from '../controllers/portal.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);
router.use(restrictTo('student', 'parent'));

router.get('/dashboard', getPortalDashboard);
router.get('/fees', getMyFees);
router.get('/attendance', getMyAttendance);
router.get('/announcements', getMyAnnouncements);
router.post('/fees/proof', uploadMyProof);
router.get('/fees/:fee_id/receipt', getMyReceipt);

export default router;