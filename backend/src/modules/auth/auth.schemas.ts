import { z } from 'zod';

export const authGoogleBodySchema = z.object({
  token: z.string().min(1, 'Google token is required'),
});

export type AuthGoogleBody = z.infer<typeof authGoogleBodySchema>;
