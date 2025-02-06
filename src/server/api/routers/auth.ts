import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { JsonObject } from "~/lib/schemas/utils";
import { createClient } from "~/lib/supabase/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  signOut: publicProcedure.mutation(async () => {
    const supabase = await createClient();
    try {
      const { error } = await supabase.auth.signOut();
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to sign out: ${(error as Error).message}`,
          cause: error,
        });
      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to sign out: ${(error as Error).message}`,
        cause: error,
      });
    }
  }),

  getSession: publicProcedure.query(async () => {
    const supabase = await createClient();
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get session: ${(error as Error).message}`,
          cause: error,
        });
      if (!session)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (profileError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get profile: ${(profileError as Error).message}`,
          cause: profileError,
        });
      if (!profile)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      const userRole = profile.role;
      const user = {
        ...session.user,
        ...profile,
        role: userRole,
        is_admin: profile.is_admin || userRole === "admin",
      };
      return { ...session, user };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get session: ${(error as Error).message}`,
        cause: error,
      });
    }
  }),

  getUser: publicProcedure.query(async () => {
    const supabase = await createClient();
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get user: ${(error as Error).message}`,
          cause: error,
        });
      if (!user)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get profile: ${(profileError as Error).message}`,
          cause: profileError,
        });
      if (!profile)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      const userMetadata = JsonObject.parse(user.user_metadata);
      const userRole = profile.role;
      return {
        ...user,
        ...profile,
        role: userRole,
        is_admin: profile.is_admin || userRole === "admin",
        user_metadata: userMetadata,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get user: ${(error as Error).message}`,
        cause: error,
      });
    }
  }),

  signInWithOAuth: publicProcedure
    .input(
      z.object({
        provider: z.enum(["google"]),
        redirectTo: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: input.provider,
          options: {
            redirectTo: input.redirectTo,
          },
        });
        if (error) throw error;
        return data;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to sign in: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  completeOnboarding: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          did_complete_onboarding: true,
        })
        .eq("id", input.userId);
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to complete onboarding: ${(error as Error).message}`,
          cause: error,
        });
      return { success: true };
    }),

  completePostTenMeetingOnboarding: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          did_complete_post_ten_meeting_onboarding: true,
        })
        .eq("id", input.userId);
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to complete post ten meeting onboarding: ${(error as Error).message}`,
          cause: error,
        });
      return { success: true };
    }),

  getCoach: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      // Get user's profile to find coach_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("coach_id")
        .eq("id", input.userId)
        .single();

      if (!profile?.coach_id) return null;

      // Get coach's profile
      const { data: coachProfile, error: coachProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.coach_id)
        .single();

      if (coachProfileError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get coach profile: ${(coachProfileError as Error).message}`,
          cause: coachProfileError,
        });
      }

      return coachProfile;
    }),
});
