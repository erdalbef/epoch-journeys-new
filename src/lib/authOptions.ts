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

            if (user.role === "AGENT" && !user.approved) {
              return null;
}

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          approved: user.approved,
          commissionRate: user.commissionRate ?? null,
          fullName: user.fullName ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.approved = user.approved;
        token.commissionRate = user.commissionRate ?? null;
        token.fullName = user.fullName ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role ?? "AGENT") as "ADMIN" | "STAFF" | "AGENT";
        session.user.approved = Boolean(token.approved);
        session.user.commissionRate =
          typeof token.commissionRate === "number"
            ? token.commissionRate
            : null;
        session.user.fullName =
          typeof token.fullName === "string" ? token.fullName : null;
      }

      return session;
    },
  },

  pages: {
    signIn: "/admin-login",
  },
};