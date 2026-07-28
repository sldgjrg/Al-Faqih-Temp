import { NextResponse } from "next/server";

const ROOT_HOST = (
  process.env.ROOT_HOST || "alfaqih.org"
).toLowerCase();

const CHAT_HOST = (
  process.env.CHAT_HOST || "chat.alfaqih.org"
).toLowerCase();

function getHostname(request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const regularHost = request.headers.get("host");

  return String(forwardedHost || regularHost || "")
    .split(",")[0]
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function isChatHost(hostname) {
  return (
    hostname === CHAT_HOST ||
    hostname === "chat.localhost"
  );
}

function isProductionRootHost(hostname) {
  return (
    hostname === ROOT_HOST ||
    hostname === `www.${ROOT_HOST}`
  );
}

export function middleware(request) {
  const hostname = getHostname(request);
  const pathname = request.nextUrl.pathname;

  /*
   * chat.alfaqih.org/
   *
   * Internally render /chat, but leave the browser URL as:
   * https://chat.alfaqih.org/
   */
  if (isChatHost(hostname)) {
    if (pathname === "/") {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = "/chat";

      return NextResponse.rewrite(rewriteUrl);
    }

    /*
     * IMPORTANT:
     * Do not redirect /chat back to / here.
     * The internal rewrite may pass through middleware again.
     */
    return NextResponse.next();
  }

  /*
   * alfaqih.org/chat
   *
   * Redirect production visitors to the dedicated subdomain.
   * Keep /chat available on localhost and Vercel preview URLs.
   */
  if (isProductionRootHost(hostname) && pathname === "/chat") {
    const destination = new URL(request.url);

    destination.protocol = "https:";
    destination.hostname = CHAT_HOST;
    destination.port = "";
    destination.pathname = "/";
    destination.search = request.nextUrl.search;

    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf)$).*)",
  ],
};