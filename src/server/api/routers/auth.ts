import { TRPCError } from "@trpc/server";
import _ from "lodash";
import { z } from "zod";

import { env } from "~/env";
import { sendInvitationEmail } from "~/lib/email";
import { getAllFlagsForRole } from "~/lib/flags/flags";
import { logger } from "~/lib/logging/server";
import { createClient as createRecallClient } from "~/lib/recall/client";
import { __dangerouslyCreateAdminClient__ } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// Define a type for Zoom OAuth credential
interface ZoomOAuthCredential {
  id: string;
  [key: string]: unknown;
}

// Define a type for app_metadata
interface AppMetadata {
  integration_providers?: string[];
  recall_zoom_oauth_credential?: ZoomOAuthCredential | null;
  recall_google_calendar_credential?: {
    id: string;
    refresh_token: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

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
        .select("*, settings:user_settings(*)")
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
      const user = _.omit(session.user, ["role"]);
      const userSettings = profile.settings[0];
      return {
        ...session,
        user: {
          ...user,
          nickname: profile.nickname,
          bot_name: userSettings?.bot_name,
          did_complete_onboarding: profile.did_complete_onboarding,
          did_complete_post_ten_meeting_onboarding:
            profile.did_complete_post_ten_meeting_onboarding,
          force_post_ten_meeting_onboarding:
            profile.force_post_ten_meeting_onboarding,
          flags: getAllFlagsForRole(profile.role),
        },
      };
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
        .select("*, settings:user_settings(*)")
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
      const userSettings = profile.settings[0];
      return {
        ..._.omit(user, ["role"]),
        nickname: profile.nickname,
        bot_name: userSettings?.bot_name,
        did_complete_onboarding: profile.did_complete_onboarding,
        did_complete_post_ten_meeting_onboarding:
          profile.did_complete_post_ten_meeting_onboarding,
        force_post_ten_meeting_onboarding:
          profile.force_post_ten_meeting_onboarding,
        flags: getAllFlagsForRole(profile.role),
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

  removeProvider: protectedProcedure
    .input(
      z.object({
        provider: z.string().min(1, "Provider is required"),
        userId: z.string().min(1, "User ID is required"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const supabaseAdmin = await __dangerouslyCreateAdminClient__();
        const recall = createRecallClient();

        // Get current user data
        const { data: userData, error: getUserError } =
          await supabaseAdmin.auth.admin.getUserById(input.userId);

        if (getUserError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to get user data: ${getUserError.message}`,
            cause: getUserError,
          });
        }

        if (!userData.user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Special handling for Zoom provider
        if (input.provider === "zoom") {
          try {
            logger.info("Cleaning up Zoom credentials in Recall", {
              userId: input.userId,
            });

            // Check if we have a stored credential ID in app_metadata
            const credentialId =
              userData.user.app_metadata?.recall_zoom_oauth_credential?.id;

            // Track if we should clear the credential from metadata
            let shouldClearCredential = false;

            if (credentialId) {
              try {
                logger.info("Deleting Zoom credential from app_metadata", {
                  credentialId,
                  userId: input.userId,
                });

                // Delete the credential using the ID from app_metadata
                await recall.zoomOauthCredentials.zoom_oauth_credentials_destroy(
                  undefined,
                  {
                    params: {
                      id: credentialId,
                    },
                  },
                );

                logger.info("Successfully deleted Zoom credential", {
                  credentialId,
                });

                // Credential was successfully deleted, mark to clear from metadata
                shouldClearCredential = true;
              } catch (destroyError) {
                logger.error("Failed to delete Zoom credential", {
                  credentialId,
                  error: destroyError,
                });
              }
            } else {
              logger.info("No Zoom credential ID found in app_metadata", {
                userId: input.userId,
              });
            }

            // Get current providers array or initialize empty array
            const currentProviders =
              userData.user.app_metadata?.integration_providers || [];

            // Remove the specified provider
            const updatedProviders = currentProviders.filter(
              (provider: string) => provider !== input.provider,
            );

            // Create updated metadata, conditionally clearing credential reference
            const updatedMetadata: AppMetadata = {
              ...userData.user.app_metadata,
              integration_providers: updatedProviders,
            };

            // Clear the credential data if successfully deleted
            if (shouldClearCredential) {
              updatedMetadata.recall_zoom_oauth_credential = null;
              logger.info("Cleared Zoom credential reference from metadata", {
                userId: input.userId,
              });
            }

            // Update user metadata
            const { error: updateError } =
              await supabaseAdmin.auth.admin.updateUserById(input.userId, {
                app_metadata: updatedMetadata,
              });

            if (updateError) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to update user metadata: ${updateError.message}`,
                cause: updateError,
              });
            }

            return { success: true };
          } catch (recallError) {
            // Log the error but continue with removing the provider from app_metadata
            logger.error("Failed to clean up Zoom credentials in Recall", {
              error: recallError,
              userId: input.userId,
            });
          }
        }

        // Special handling for Google provider
        if (input.provider === "google") {
          logger.info("Cleaning up Google Calendar credential", {
            userId: input.userId,
          });

          try {
            await recall.calendarV2.calendars_destroy(undefined, {
              params: {
                id: userData.user.app_metadata
                  ?.recall_google_calendar_credential?.id,
              },
            });
          } catch {
            const allRecallCalendars = await recall.calendarV2.calendars_list({
              queries: {
                platform: "google_calendar",
              },
            });
            logger.info("All Recall calendars", {
              allRecallCalendars,
            });

            const calendarToDelete = allRecallCalendars.results?.find(
              (calendar) => calendar.oauth_email === userData.user.email,
            );

            if (calendarToDelete) {
              await recall.calendarV2.calendars_destroy(undefined, {
                params: { id: calendarToDelete.id },
              });
            }
          }

          // Get current providers array or initialize empty array
          const currentProviders =
            userData.user.app_metadata?.integration_providers || [];

          // Remove the specified provider
          const updatedProviders = currentProviders.filter(
            (provider: string) => provider !== input.provider,
          );

          // Create updated metadata, clearing credential reference
          const updatedMetadata: AppMetadata = {
            ...userData.user.app_metadata,
            integration_providers: updatedProviders,
            recall_google_calendar_credential: null,
          };

          // Update user metadata
          const { error: updateError } =
            await supabaseAdmin.auth.admin.updateUserById(input.userId, {
              app_metadata: updatedMetadata,
            });

          if (updateError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to update user metadata: ${updateError.message}`,
              cause: updateError,
            });
          }

          logger.info("Successfully cleared Google Calendar credentials", {
            userId: input.userId,
          });

          return { success: true };
        }

        // Handle non-Zoom providers or fallback if Zoom cleanup fails
        // Get current providers array or initialize empty array
        const currentProviders =
          userData.user.app_metadata?.integration_providers || [];

        // Remove the specified provider
        const updatedProviders = currentProviders.filter(
          (provider: string) => provider !== input.provider,
        );

        // Update user metadata
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(input.userId, {
            app_metadata: {
              ...userData.user.app_metadata,
              integration_providers: updatedProviders,
            },
          });

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update user metadata: ${updateError.message}`,
            cause: updateError,
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to remove provider: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  handleZoomReviewerInvite: publicProcedure
    .input(
      z.object({
        clientId: z.string().min(1, "Zoom app client ID is required"),
        email: z.string().email("Please provide a valid email address"),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.clientId !== env.ZOOM_CLIENT_ID) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Zoom app client ID.",
        });
      }

      const supabase = await createClient();

      try {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("email", input.email)
          .single();

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A user with this email already exists.",
          });
        }

        const { data: existingInvite } = await supabase
          .from("user_invites")
          .select("id")
          .eq("email", input.email)
          .single();

        if (existingInvite) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This email already has an active invitation.",
          });
        }

        const { data: userInvite, error: inviteError } = await supabase
          .from("user_invites")
          .insert({
            first_name: "Zoom Reviewer",
            last_name: "",
            company: "Zoom",
            email: input.email,
            invited_by: "b34f1438-bccc-41fe-84de-5c575aeaaceb",
            role: "user",
          })
          .select("*, invited_by_profile:profiles(*)")
          .single();

        if (inviteError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create invitation: ${inviteError.message}`,
            cause: inviteError,
          });
        }

        try {
          await sendInvitationEmail({ invite: userInvite });
        } catch (emailError) {
          console.error("Failed to send invitation email:", emailError);
          // Remove the created invite since email sending failed
          await supabase.from("user_invites").delete().eq("id", userInvite.id);

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to send invitation email: ${(emailError as Error).message}`,
            cause: emailError,
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send invitation: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  checkUserHasAuthorizedZoom: publicProcedure
    .input(z.object({ profileId: z.string() }))
    .output(z.boolean())
    .query(async ({ input }) => {
      const supabaseAdmin = await __dangerouslyCreateAdminClient__();
      const { data: userData, error: getUserError } =
        await supabaseAdmin.auth.admin.getUserById(input.profileId);

      if (getUserError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get user data: ${getUserError.message}`,
          cause: getUserError,
        });
      }

      const { user } = userData;

      return !!user.app_metadata?.integration_providers?.includes("zoom");
    }),
});
