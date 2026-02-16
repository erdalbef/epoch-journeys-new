import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        // ✅ Block ONLY unapproved AGENTs (admins can always sign in)
        if (user.role === "AGENT" && !user.approved) {
          // NOTE: returning null keeps NextAuth behavior consistent
          // (your UI shows "Invalid credentials, or pending approval")
          return null;
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // ✅ IMPORTANT: include role/approved so callbacks can persist them into JWT
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          approved: user.approved,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On first login, `user` exists, later requests only have `token`
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.approved = user.approved;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role ?? "AGENT") as "ADMIN" | "AGENT";
        session.user.approved = Boolean(token.approved);
      }
      return session;
    },
  },

  pages: {
    signIn: "/admin-login",
  },
};
