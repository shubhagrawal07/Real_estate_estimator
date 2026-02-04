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
            (user as any).backendToken = data.token;
            (user as any).backendUserId = data.user.userId;
            (user as any).backendUserRole = data.user.role;
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
        if ((user as any).backendToken) {
          token.backendToken = (user as any).backendToken;
          token.backendUserId = (user as any).backendUserId;
          token.backendUserRole = (user as any).backendUserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Include user image and other data in session
      if (token) {
        if (session.user) {
          const user = session.user as any;
          if (token.id) user.id = token.id as string;
          if (token.name) user.name = token.name as string;
          if (token.email) user.email = token.email as string;
          // Ensure image is set from token.picture
          if (token.picture) {
            user.image = token.picture as string;
          }
        }
        if (token.backendToken) {
          (session as any).backendToken = token.backendToken;
          (session as any).backendUserId = token.backendUserId;
          (session as any).userRole = token.backendUserRole;
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

