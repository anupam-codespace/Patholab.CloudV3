/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses sliding-window counters per IP + key.
 */
import { NextRequest, NextResponse } from 'next/server';

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

// Periodically clean up expired buckets
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  key?: string;
  identifierFn?: (req: NextRequest) => string;
  message?: string;
}

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<void> {
  const ip = options.identifierFn
    ? options.identifierFn(req)
    : (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
       req.headers.get('x-real-ip') ||
       'unknown');

  const bucketKey = `${options.key || 'default'}:${ip}`;
  const now = Date.now();
  const resetAt = now + options.windowMs;

  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt });
    return;
  }

  if (bucket.count >= options.max) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    throw new RateLimitError(retryAfterSec, options.message || 'Too many requests. Please try again later.');
  }

  bucket.count += 1;
}

export function withRateLimit(options: RateLimitOptions) {
  return function <T extends (req: NextRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (req: NextRequest, ...args: any[]) => {
      try {
        await rateLimit(req, options);
      } catch (err) {
        if (err instanceof RateLimitError) {
          return err.toResponse();
        }
        throw err;
      }
      return handler(req, ...args);
    }) as T;
  };
}

export class RateLimitError extends Error {
  constructor(public retryAfterSec: number, message: string) {
    super(message);
    this.name = 'RateLimitError';
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      { error: this.message, retryAfter: this.retryAfterSec },
      {
        status: 429,
        headers: {
          'Retry-After': String(this.retryAfterSec),
          'X-RateLimit-Limit': 'max',
        },
      }
    );
  }
}
