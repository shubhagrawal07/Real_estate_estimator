import 'next-auth';

declare module 'next-auth' {
  interface Session {
    backendToken?: string;
    backendUserId?: string;
    userRole?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendToken?: string;
    backendUserId?: string;
    backendUserRole?: string;
  }
}

export interface SessionWithBackend {
  backendToken?: string;
  backendUserId?: string;
  userRole?: string;
}
