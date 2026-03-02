import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    class_id: z.string({ required_error: 'Class ID is required' })
      .uuid('Invalid class ID'),
    date: z.string({ required_error: 'Date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  })
});

export const scanQRSchema = z.object({
  body: z.object({
    qr_token: z.string({ required_error: 'QR token is required' })
      .min(1, 'QR token cannot be empty'),
    student_id: z.string({ required_error: 'Student ID is required' })
      .uuid('Invalid student ID')
  })
});

export const markManualSchema = z.object({
  body: z.object({
    session_id: z.string({ required_error: 'Session ID is required' })
      .uuid('Invalid session ID'),
    student_id: z.string({ required_error: 'Student ID is required' })
      .uuid('Invalid student ID')
  })
});