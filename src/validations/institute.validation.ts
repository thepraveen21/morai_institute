import { z } from 'zod';

export const createInstituteSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Institute name is required' })
      .min(2, 'Name must be at least 2 characters'),
    address: z.string().optional(),
    contact: z.string()
      .regex(/^[0-9+\s-]{7,15}$/, 'Invalid contact number')
      .optional(),
    email: z.string().email('Invalid email address').optional()
  })
});

export const updateInstituteSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    address: z.string().optional(),
    contact: z.string()
      .regex(/^[0-9+\s-]{7,15}$/, 'Invalid contact number')
      .optional(),
    email: z.string().email('Invalid email address').optional()
  }),
  params: z.object({
    id: z.string().uuid('Invalid institute ID')
  })
});