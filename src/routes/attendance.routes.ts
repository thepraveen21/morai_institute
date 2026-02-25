import { Router } from 'express';
import {
  createSession,
  getSessions,
  getSessionById,
  scanQR,
  markManual,
  getAbsentList,
  getStudentAttendanceSummary
} from '../controllers/attendance.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

// Session routes
router.post('/session', restrictTo('admin'), createSession);
router.get('/session', getSessions);
router.get('/session/:id', getSessionById);
router.get('/session/:session_id/absent', restrictTo('admin'), getAbsentList);

// Marking routes
router.post('/scan', scanQR);
router.post('/manual', restrictTo('admin'), markManual);

// Summary
router.get('/summary/:student_id', getStudentAttendanceSummary);

export default router;