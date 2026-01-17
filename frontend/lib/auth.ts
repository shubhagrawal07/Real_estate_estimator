import { getSession } from 'next-auth/react';

export async function getAuthToken(): Promise<string | null> {
  const session = await getSession();
  return (session as any)?.backendToken || null;
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return (session as any)?.backendUserId || null;
}

