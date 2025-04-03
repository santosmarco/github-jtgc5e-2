import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createClient } from "~/lib/supabase/server";
import { transformUserInviteIntoProfile } from "~/lib/user-invites/transformations";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const clientsRouter = createTRPCRouter({
  getClients: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        loadAll: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const clientsQuery = supabase.from("profiles").select("*");

      if (!input.loadAll) {
        clientsQuery.eq("coach_id", input.userId);
      }

      const userInvitesQuery = supabase
        .from("user_invites")
        .select("*, invited_by_profile:profiles(*)");

      if (!input.loadAll) {
        userInvitesQuery.eq("invited_by", input.userId);
      }

      const [{ data: clients }, { data: userInvites }] = await Promise.all([
        clientsQuery,
        userInvitesQuery,
      ]);

      const clientsWithCoach = await Promise.all(
        (clients ?? []).map(async (client) => {
          if (client.coach_id) {
            const { data: coach } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", client.coach_id)
              .maybeSingle();

            if (coach) {
              return { ...client, coach: [coach] };
            }
          }
          return { ...client, coach: [] };
        }),
      );

      return [
        ...clientsWithCoach,
        ...(userInvites ?? []).map(transformUserInviteIntoProfile),
      ];
    }),

  deactivateClient: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { data: clientProfile, error: clientProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();

      if (clientProfileError || !clientProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      if (clientProfile.status === "inactive") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Client is already inactive",
        });
      }

      const { error } = await supabase
        .from("profiles")
        .update({ status: "inactive" })
        .eq("id", clientProfile.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to deactivate client",
        });
      }

      return { success: true };
    }),

  reactivateClient: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { data: clientProfile, error: clientProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();

      if (clientProfileError || !clientProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      const { error } = await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", clientProfile.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reactivate client",
        });
      }

      return { success: true };
    }),
});
