import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && account.id_token) {
        try {
          // Use API_URL for server-side calls (internal Docker network) or fallback to NEXT_PUBLIC_API_URL
          // API_URL should be set to http://backend:3001 in Docker, NEXT_PUBLIC_API_URL is for client-side
          const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          // Send the Google token to our backend to authenticate
          const response = await fetch(`${apiUrl}/auth/google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: account.id_token }),
          });

          if (response.ok) {
            const data = await response.json();
            const u = user as { backendToken?: string; backendUserId?: string; backendUserRole?: string };
            u.backendToken = data.token;
            u.backendUserId = data.user.userId;
            u.backendUserRole = data.user.role;
            return true;
          }
        } catch (error) {
          console.error('Backend authentication failed:', error);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in - preserve user data including image
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        // Preserve image from Google - it should be in user.image
        if (user.image) {
          token.picture = user.image;
        }
        const u = user as { backendToken?: string; backendUserId?: string; backendUserRole?: string };
        if (u.backendToken) {
          token.backendToken = u.backendToken;
          token.backendUserId = u.backendUserId;
          token.backendUserRole = u.backendUserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Include user image and other data in session
      if (token) {
        if (session.user) {
          const u = session.user as { id?: string; name?: string; email?: string; image?: string };
          if (token.id) u.id = token.id as string;
          if (token.name) u.name = token.name as string;
          if (token.email) u.email = token.email as string;
          if (token.picture) u.image = token.picture as string;
        }
        if (token.backendToken) {
          session.backendToken = token.backendToken;
          session.backendUserId = token.backendUserId;
          session.userRole = token.backendUserRole;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

