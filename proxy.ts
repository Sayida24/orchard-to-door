import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Logged-in customers opening the front page go straight to their dashboard.
// 2. Logged-out visitors to private areas are sent to /login.
// Role checks (seller/admin) happen in each page and server action via
// requireUser(), which reads the role from the database (NFR-07).
export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (request.nextUrl.pathname === "/") {
    return token?.role === "CUSTOMER"
      ? NextResponse.redirect(new URL("/customer", request.url))
      : NextResponse.next();
  }

  if (token) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/", "/admin/:path*", "/seller/:path*", "/account/:path*", "/orders/:path*"],
};
