import { Router } from 'express';
import {
  createSession, getSessions, getSessionById,
  scanQR, markManual, getAbsentList,
  getStudentAttendanceSummary
} from '../controllers/attendance.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createSessionSchema,
  scanQRSchema,
  markManualSchema
} from '../validations/attendance.validation';

const router = Router();

router.use(protect);

router.post('/session', restrictTo('admin'), validate(createSessionSchema), createSession);
router.get('/session', getSessions);
router.get('/session/:id', getSessionById);
router.get('/session/:session_id/absent', restrictTo('admin'), getAbsentList);
router.post('/scan', validate(scanQRSchema), scanQR);
router.post('/manual', restrictTo('admin'), validate(markManualSchema), markManual);
router.get('/summary/:student_id', getStudentAttendanceSummary);

export default router;