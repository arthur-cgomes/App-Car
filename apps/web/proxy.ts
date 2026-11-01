import { NextResponse, type NextRequest } from "next/server";

const SESSION_HINT = "placar_session";

const PUBLIC_PATHS = ["/entrar", "/criar-conta", "/esqueci-senha", "/nova-senha"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_HINT);
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  if (hasSession && pathname === "/entrar") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icon.svg|manifest.webmanifest|robots.txt|favicon.ico).*)"],
};
