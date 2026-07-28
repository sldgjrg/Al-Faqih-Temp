import { NextResponse } from "next/server";

const CHAT_HOST = (process.env.CHAT_HOST || "chat.alfaqih.org").toLowerCase();
const ROOT_HOSTS = new Set([
  (process.env.ROOT_HOST || "alfaqih.org").toLowerCase(),
  `www.${(process.env.ROOT_HOST || "alfaqih.org").toLowerCase()}`,
]);

function hostnameFrom(request) {
  return (request.headers.get("host") || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function isChatHostname(hostname) {
  return hostname === CHAT_HOST || hostname === "chat.localhost";
}

export function middleware(request) {
  const hostname = hostnameFrom(request);
  const url = request.nextUrl.clone();

  // chat.alfaqih.org/ renders the internal /chat route while the public URL
  // remains clean. Static assets, API routes, and service workers keep their
  // normal paths and are therefore shared by both domains.
  if (isChatHostname(hostname)) {
    if (url.pathname === "/") {
      url.pathname = "/chat";
      return NextResponse.rewrite(url);
    }

    if (url.pathname === "/chat") {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Keep /chat usable on previews and localhost. On the production root
  // domain, however, send visitors to the dedicated chat subdomain.
  if (ROOT_HOSTS.has(hostname) && url.pathname === "/chat") {
    const destination = new URL(request.url);
    destination.protocol = "https:";
    destination.host = CHAT_HOST;
    destination.pathname = "/";
    destination.search = url.search;
    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf)$).*)",
  ],
};
