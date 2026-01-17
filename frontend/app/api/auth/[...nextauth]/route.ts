import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && account.id_token) {
        try {
          // Send the Google token to our backend to authenticate
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: account.id_token }),
          });

          if (response.ok) {
            const data = await response.json();
            // Store the JWT token in the user object
            user.backendToken = data.token;
            user.backendUserId = data.user.userId;
            return true;
          }
        } catch (error) {
          console.error('Backend authentication failed:', error);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && (user as any).backendToken) {
        token.backendToken = (user as any).backendToken;
        token.backendUserId = (user as any).backendUserId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.backendToken) {
        (session as any).backendToken = token.backendToken;
        (session as any).backendUserId = token.backendUserId;
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

