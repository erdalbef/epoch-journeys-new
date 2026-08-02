import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "STAFF" | "AGENT";
      approved: boolean;
      commissionRate?: number | null;
      fullName?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "STAFF" | "AGENT";
    approved: boolean;
    commissionRate?: number | null;
    fullName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "STAFF" | "AGENT";
    approved: boolean;
    commissionRate?: number | null;
    fullName?: string | null;
  }
}