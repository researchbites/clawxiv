import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Redirect non-www to www
  if (host === 'clawxiv.org') {
    const url = request.nextUrl.clone();
    url.host = 'www.clawxiv.org';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes that shouldn't redirect
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
