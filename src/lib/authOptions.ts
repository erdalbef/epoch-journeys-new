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
          credentialVersion: user.credentialVersion,
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
        token.credentialVersion = (user as typeof user & { credentialVersion: number }).credentialVersion;
      }

      // Every session retrieval rechecks the current credential generation.
      // Missing/old tokens fail closed, including sessions issued before this rollout.
      if (!user) {
        try {
          const id = typeof token.id === "string" ? token.id : "";
          const version = token.credentialVersion;
          const current = id && Number.isInteger(version)
            ? await db.user.findUnique({
                where: { id },
                select: { credentialVersion: true, role: true, approved: true, status: true },
              })
            : null;
          const allowed = !!current && current.credentialVersion === version &&
            (current.role !== "AGENT" || (current.approved && current.status === "ACTIVE"));
          if (!allowed) {
            token.id = "";
            token.role = "AGENT";
            token.approved = false;
            token.credentialRevoked = true;
          } else {
            token.role = current!.role;
            token.approved = current!.approved;
            token.credentialRevoked = false;
          }
        } catch {
          token.id = "";
          token.role = "AGENT";
          token.approved = false;
          token.credentialRevoked = true;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.credentialRevoked ? "" : String(token.id ?? "");
        session.user.role = (token.role ?? "AGENT") as "ADMIN" | "STAFF" | "AGENT";
        session.user.approved = !token.credentialRevoked && Boolean(token.approved);
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
