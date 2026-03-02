import { Router } from 'express';
import {
  createStudent, getStudents, getStudentById,
  updateStudent, deleteStudent, enrollStudent, unenrollStudent
} from '../controllers/student.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createStudentSchema, enrollStudentSchema } from '../validations/student.validation';

const router = Router();

router.use(protect);

router.post('/', restrictTo('admin'), validate(createStudentSchema), createStudent);
router.get('/', getStudents);
router.get('/:id', getStudentById);
router.put('/:id', restrictTo('admin'), updateStudent);
router.delete('/:id', restrictTo('admin'), deleteStudent);
router.post('/enroll', restrictTo('admin'), validate(enrollStudentSchema), enrollStudent);
router.delete('/unenroll', restrictTo('admin'), unenrollStudent);

export default router;