import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    console.log("MIDDLEWARE_PATH:", pathname);
    console.log("MIDDLEWARE_ROLE:", token?.role);
    console.log("MIDDLEWARE_APPROVED:", token?.approved);

    // 🚫 Not logged in
    if (!token) {
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin-login", req.url));
      }

      if (pathname.startsWith("/b2b")) {
        return NextResponse.redirect(new URL("/agent-login", req.url));
      }

      return NextResponse.next();
    }

    // 🔐 ADMIN routes
    if (pathname.startsWith("/admin")) {
      if (token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/admin-login", req.url));
      }
    }

    // 🔐 B2B routes (Agents only)
    if (pathname.startsWith("/b2b")) {
      if (token.role !== "AGENT" || token.approved !== true) {
        return NextResponse.redirect(new URL("/agent-login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // we handle logic above
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/b2b/:path*"],
};
