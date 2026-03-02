import { z } from 'zod';

export const createStudentSchema = z.object({
  body: z.object({
    institute_id: z.string({ required_error: 'Institute ID is required' })
      .uuid('Invalid institute ID'),
    name: z.string({ required_error: 'Student name is required' })
      .min(2, 'Name must be at least 2 characters'),
    date_of_birth: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional(),
    grade: z.string().optional(),
    parent_name: z.string().optional(),
    parent_contact: z.string()
      .regex(/^[0-9+\s-]{7,15}$/, 'Invalid contact number')
      .optional(),
    parent_email: z.string().email('Invalid parent email').optional(),
    address: z.string().optional()
  })
});

export const enrollStudentSchema = z.object({
  body: z.object({
    student_id: z.string({ required_error: 'Student ID is required' })
      .uuid('Invalid student ID'),
    class_id: z.string({ required_error: 'Class ID is required' })
      .uuid('Invalid class ID')
  })
});