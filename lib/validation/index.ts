// Validation schemas — to be implemented in a later stage using Zod.
// This module will contain reusable Zod schemas for form validation.

import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens.');

export const tagListSchema = z
  .string()
  .optional()
  .transform((val) => (val ? val.split(',').map((t) => t.trim()).filter(Boolean) : []));
