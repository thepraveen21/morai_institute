import { Router } from 'express';
import {
  getMyClasses,
  getMyClassById,
  getMyClassAttendance,
  getMyClassSessions,
  getTeacherDashboard
} from '../controllers/teacher.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

// All routes — teacher only
router.use(protect);
router.use(restrictTo('teacher'));

router.get('/dashboard', getTeacherDashboard);
router.get('/classes', getMyClasses);
router.get('/classes/:id', getMyClassById);
router.get('/classes/:id/attendance', getMyClassAttendance);
router.get('/classes/:id/sessions', getMyClassSessions);

export default router;