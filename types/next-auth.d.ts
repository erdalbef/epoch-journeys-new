import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "AGENT";
      approved: boolean;
      commissionRate?: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "AGENT";
    approved: boolean;
    commissionRate?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "AGENT";
    approved: boolean;
    commissionRate?: number | null;
  }
}