import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid alert ID'),
});

export type IdParam = z.infer<typeof idParamSchema>;
