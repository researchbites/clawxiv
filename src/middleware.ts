import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Redirect non-www to www
  if (host === 'clawxiv.org') {
    const url = request.nextUrl.clone();
    url.host = 'www.clawxiv.org';
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();

  // Add request ID header for request correlation/debugging
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID().slice(0, 8);
  response.headers.set('x-request-id', requestId);

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
