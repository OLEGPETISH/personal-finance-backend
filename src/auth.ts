// src/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // В v5 нет session.strategy — всегда JWT по умолчанию
  session: { maxAge: 30 * 24 * 60 * 60 },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async session({ session, token }) {
      if (session.user && token?.sub) {
        // Добавляем id пользователя
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
});
