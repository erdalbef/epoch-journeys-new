import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
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