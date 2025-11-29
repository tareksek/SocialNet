// middleware.js (في الجذر)
import { NextResponse } from 'next/server';

export function middleware(request) {
  // يمكنك توسيعه لاحقًا للـ protected routes
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
