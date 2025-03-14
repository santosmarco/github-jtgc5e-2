import { type LogtailRequest, withLogtail } from "@logtail/next";
import type { MiddlewareConfig } from "next/server";

import { updateSession } from "~/lib/supabase/middleware";

import type { logger } from "./lib/logging/server";

export const middleware = withLogtail(async (request: LogtailRequest) => {
  const requestReport = {
    startTime: performance.now(),
    ip: request.ip,
    region: request.geo?.country,
    path: request.nextUrl.pathname,
    host: request.nextUrl.host,
    method: request.method,
    scheme: request.nextUrl.protocol.replace(":", ""),
    userAgent: request.headers.get("user-agent"),
    requestId: crypto.randomUUID(),
  } satisfies Parameters<typeof logger.withRequest>[0] &
    Record<string, unknown>;

  const logPrefix = `${requestReport.method} ${requestReport.path}`;

  request.log.info(`${logPrefix} started`);

  const response = await updateSession(request);

  request.log.attachResponseStatus(response.status);

  const duration = performance.now() - requestReport.startTime;

  request.log.info(`${logPrefix} completed with status ${response.status}`, {
    status: response.status,
    statusText: response.statusText,
    duration,
  });

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|embed|api/webhooks|api/emails|api/processing|_zoom|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
} satisfies MiddlewareConfig;
