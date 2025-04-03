import { initTRPC, TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import { ZodError } from "zod";

import { logger } from "~/lib/logging/server";
import { JsonObject } from "~/lib/schemas/utils";
import { createClient } from "~/lib/supabase/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    headers: opts.headers,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: SuperJSON,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

const loggingMiddleware = t.middleware(
  async ({ type, path, meta, input, next }) => {
    const startTime = performance.now();
    const requestId = crypto.randomUUID();
    const context = { type, path, meta, input, requestId };

    const trpcLogger = logger.with(context);

    trpcLogger.info(`[TRPC] ${path} procedure invoked`, {
      event: "procedure.start",
    });

    try {
      const result = await next();

      const duration = performance.now() - startTime;

      trpcLogger.info(`[TRPC] ${path} procedure succeeded`, {
        event: "procedure.success",
        duration,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      trpcLogger.error(`[TRPC] ${path} procedure failed`, {
        event: "procedure.error",
        error,
        duration,
      });

      throw error;
    }
  },
);

export const publicProcedure = t.procedure.use(loggingMiddleware);

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get user: ${userError.message}`,
      cause: userError,
    });
  }

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get profile: ${profileError.message}`,
      cause: profileError,
    });
  }

  if (!profile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Profile not found",
    });
  }

  const userMetadata = JsonObject.parse(user.user_metadata);
  const userRole = profile.role;
  const isAdmin = profile.is_admin || userRole === "admin";

  try {
    return next({
      ctx: {
        ...ctx,
        user: {
          ...user,
          ...profile,
          user_metadata: userMetadata,
          role: userRole,
          is_admin: isAdmin,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to authenticate user: ${message}`,
      cause: error,
    });
  }
});

export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(authMiddleware);
