import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const businessSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(3000),
  categoryId: z.string().uuid(),
  locality: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(300),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9()\-\s]{7,32}$/)
    .or(z.literal(''))
    .optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9()\-\s]{7,32}$/)
    .or(z.literal(''))
    .optional(),
});

export const issueSubmissionSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(120),
});
