import type { NextRequest } from "next/server";

const RECALL_WEBHOOK_URL =
  "https://us-west-2.recall.ai/api/v2/zoom-oauth-apps/47e18e83-c849-43b6-870e-1889cd9d1d2a/webhook";

async function handler(request: NextRequest) {
  // Clone the request to forward
  const forwardRequest = new Request(RECALL_WEBHOOK_URL, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    // Forward cache settings
    cache: request.cache,
    credentials: request.credentials,
    integrity: request.integrity,
    keepalive: request.keepalive,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,
  });

  // Forward the request and return the response directly
  return fetch(forwardRequest);
}

// Export all HTTP methods to handle any type of request
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
