import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

/**
 * Extend NextAuth types to include our custom fields
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      image?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    username?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    username?: string;
  }
}
