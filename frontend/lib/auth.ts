import { getSession } from 'next-auth/react';

export async function getAuthToken(): Promise<string | null> {
  const session = await getSession();
  return session?.backendToken ?? null;
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.backendUserId ?? null;
}
