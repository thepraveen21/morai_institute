import { Router } from 'express';
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  enrollStudent,
  unenrollStudent
} from '../controllers/student.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', restrictTo('admin'), createStudent);
router.get('/', getStudents);
router.get('/:id', getStudentById);
router.put('/:id', restrictTo('admin'), updateStudent);
router.delete('/:id', restrictTo('admin'), deleteStudent);

// Enrollment routes
router.post('/enroll', restrictTo('admin'), enrollStudent);
router.delete('/unenroll', restrictTo('admin'), unenrollStudent);

export default router;