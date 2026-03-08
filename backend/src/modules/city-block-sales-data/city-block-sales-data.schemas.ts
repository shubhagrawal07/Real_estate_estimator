import { z } from 'zod';

export const processDataBodySchema = z.object({
  anneemut_min: z.number(),
  anneemut_max: z.number(),
  code_insee: z.string().min(1),
});

export type ProcessDataBody = z.infer<typeof processDataBodySchema>;
