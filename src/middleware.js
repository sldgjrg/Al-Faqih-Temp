import { NextResponse } from "next/server";

export function middleware(request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = String(forwardedHost || request.headers.get("host") || "")
    .split(",")[0]
    .split(":")[0]
    .trim()
    .toLowerCase();

  const isChatHost =
    host === "chat.alfaqih.org" ||
    host === "chat.localhost";

  if (isChatHost && request.nextUrl.pathname === "/") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/chat";

    return NextResponse.rewrite(destination);
  }

  return NextResponse.next();
}

/*
 * Only run middleware for the public root URL.
 *
 * The internal rewrite target /chat will not match this middleware again,
 * eliminating any possibility of / → /chat → / loops.
 */
export const config = {
  matcher: ["/"],
};