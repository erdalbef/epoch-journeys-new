import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Block legacy static payment receipts, including for logged-in users.
    // Receipts must be delivered through the permission-checked API endpoint.
    if (pathname === "/uploads/payments" || pathname.startsWith("/uploads/payments/")) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Public login pages should never be blocked
    if (pathname === "/admin-login" || pathname === "/agent-login") {
      return NextResponse.next();
    }

    // Not logged in
    if (!token) {
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin-login", req.url));
      }

      if (pathname.startsWith("/b2b")) {
        return NextResponse.redirect(new URL("/agent-login", req.url));
      }

      return NextResponse.next();
    }

    // A signed JWT remains cryptographically valid after a password reset.
    // Recheck the database version here, since withAuth/getToken do not run
    // the NextAuth callbacks.jwt version validation used by getServerSession.
    // Requires the default Node.js proxy runtime in Next.js 16; verify in build.
    const userId = typeof token.id === "string" ? token.id : "";
    const version = token.credentialVersion;
    try {
      const current = userId && Number.isInteger(version)
        ? await db.user.findUnique({
            where: { id: userId },
            select: { credentialVersion: true, role: true, approved: true, status: true },
          })
        : null;
      if (!current || current.credentialVersion !== version ||
          current.role !== token.role ||
          (current.role === "AGENT" && (!current.approved || current.status !== "ACTIVE"))) {
        const login = pathname.startsWith("/admin") ? "/admin-login" : "/agent-login";
        return NextResponse.redirect(new URL(login, req.url));
      }
    } catch {
      // Database unavailable: deny access rather than trusting a stale JWT.
      return new NextResponse("Authentication temporarily unavailable", { status: 503 });
    }

    // Admin routes
    if (pathname.startsWith("/admin")) {
      if (token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/admin-login", req.url));
      }
    }

    // B2B routes
    if (pathname.startsWith("/b2b")) {
      if (token.role !== "AGENT" || token.approved !== true) {
        return NextResponse.redirect(new URL("/agent-login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/b2b/:path*", "/uploads/payments/:path*", "/uploads/payments"],
};