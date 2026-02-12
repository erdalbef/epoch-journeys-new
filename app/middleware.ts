import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith("/admin")) {
        return token?.role === "ADMIN" && token?.approved === true;
      }

      return true;
    },
  },
});

export const config = {
  matcher: ["/admin/:path*"],
};
