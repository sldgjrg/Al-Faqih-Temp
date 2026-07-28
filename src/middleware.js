import { NextResponse } from "next/server";

const ROOT_HOST = (
  process.env.ROOT_HOST || "alfaqih.org"
).toLowerCase();

const CHAT_HOST = (
  process.env.CHAT_HOST || "chat.alfaqih.org"
).toLowerCase();

function getHostname(request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";

  return host
    .split(",")[0]
    .split(":")[0]
    .trim()
    .toLowerCase();
}

export function middleware(request) {
  const hostname = getHostname(request);
  const pathname = request.nextUrl.pathname;

  const isChatDomain =
    hostname === CHAT_HOST ||
    hostname === "chat.localhost";

  const isRootDomain =
    hostname === ROOT_HOST ||
    hostname === `www.${ROOT_HOST}`;

  /*
   * chat.alfaqih.org/
   * Internally serves /chat without changing the browser URL.
   *
   * Do not redirect /chat back to / here, because the rewrite itself
   * may pass through middleware again and create a redirect loop.
   */
  if (isChatDomain && pathname === "/") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/chat";

    return NextResponse.rewrite(rewriteUrl);
  }

  /*
   * alfaqih.org/chat
   * Redirects visitors to the dedicated chat subdomain.
   */
  if (isRootDomain && pathname === "/chat") {
    const destination = request.nextUrl.clone();

    destination.protocol = "https:";
    destination.host = CHAT_HOST;
    destination.pathname = "/";

    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf)$).*)",
  ],
};