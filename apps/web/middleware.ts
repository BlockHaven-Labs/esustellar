import { NextRequest, NextResponse } from "next/server";

// In-memory store: ip -> { count, resetAt }
// Note: this resets on cold starts; for multi-instance deployments use Redis/Upstash.
const ipStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimit {
  requests: number; // max requests per window
  windowMs: number; // window in milliseconds
}

// Per-route limits (stricter on mutation/faucet-adjacent routes)
const ROUTE_LIMITS: Array<{ pattern: RegExp; limit: RateLimit }> = [
  { pattern: /^\/api\//, limit: { requests: 60, windowMs: 60_000 } },
];

const DEFAULT_LIMIT: RateLimit = { requests: 120, windowMs: 60_000 };

function getLimit(pathname: string): RateLimit {
  for (const { pattern, limit } of ROUTE_LIMITS) {
    if (pattern.test(pathname)) return limit;
  }
  return DEFAULT_LIMIT;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const key = `${ip}:${pathname.split("/").slice(0, 3).join("/")}`;
  const limit = getLimit(pathname);
  const now = Date.now();

  let entry = ipStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + limit.windowMs };
    ipStore.set(key, entry);
  }

  entry.count += 1;

  const remaining = Math.max(0, limit.requests - entry.count);
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count > limit.requests) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit.requests),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(limit.requests));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
  return res;
}

export const config = {
  // Apply to all routes except Next.js internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
