import _ from "lodash";
import type { User } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

import { env } from "~/env";
import { logger } from "~/lib/logging/server";
import { createClient as createRecallClient } from "~/lib/recall/client";
import { __dangerouslyCreateAdminClient__ } from "~/lib/supabase/admin";

/**
 * Script to update all Supabase users with Google integration
 * and link with their Recall calendars
 */
async function main() {
  try {
    logger.info("Starting user Google integration update script");

    // Create Supabase admin client
    const supabaseAdmin = await __dangerouslyCreateAdminClient__();
    logger.info("Supabase admin client created");

    // Create Recall client
    const recall = createRecallClient();
    logger.info("Recall client created");

    // Fetch all Recall calendars for Google Calendar
    const allRecallCalendars = await recall.calendarV2.calendars_list({
      queries: {
        platform: "google_calendar",
      },
    });

    logger.info(
      `Found ${allRecallCalendars.results?.length || 0} Google Calendar entries in Recall`,
    );

    // Get all Supabase users
    const { data: usersData, error } =
      await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      logger.error("Failed to list users:", error);
      throw error;
    }

    const users = usersData.users;
    logger.info(`Found ${users.length} users in Supabase`);

    // Process each user
    for (const user of users) {
      if (!user.email) {
        logger.warn(`User ${user.id} has no email, skipping`);
        continue;
      }

      try {
        logger.info(`Processing user: ${user.email} (${user.id})`);

        // Get user profile to check role
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profile) {
          logger.warn(`No profile found for user ${user.id}, skipping`);
          continue;
        }

        // Skip coaches as they don't need calendars
        if (profile.role === "coach") {
          logger.info(`User ${user.email} is a coach, skipping calendar setup`);
          continue;
        }

        // Find existing calendar by email
        const existingCalendar = allRecallCalendars.results?.find(
          (calendar) => calendar.oauth_email === user.email,
        );

        // Get user data with complete metadata
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
          user.id,
        );

        if (!userData?.user) {
          logger.warn(`Could not fetch user data for ${user.id}, skipping`);
          continue;
        }

        // Create metadata update with safe type assertions
        const appMetadata = userData.user.app_metadata || {};

        // Safely access and modify integration_providers
        const providers = Array.isArray(appMetadata.integration_providers)
          ? appMetadata.integration_providers
          : [];

        const updatedProviders = _.uniq([...providers, "google"]);

        // Construct update payload
        const metadataUpdate = {
          ...appMetadata,
          integration_providers: updatedProviders,
        };

        // Add calendar credential if we found one
        if (existingCalendar) {
          logger.info(
            `Found calendar for ${user.email}: ${existingCalendar.id}`,
          );

          // @ts-ignore - Add calendar credential to update payload
          metadataUpdate.recall_google_calendar_credential = {
            id: existingCalendar.id,
          };

          // Check if calendar entry exists in database
          const { data: existingDbCalendar } = await supabaseAdmin
            .from("recall_calendars_v2")
            .select("*")
            .eq("profile_id", user.id)
            .eq("platform", "google_calendar")
            .maybeSingle();

          if (!existingDbCalendar) {
            logger.info(
              `Creating recall_calendars_v2 entry for user ${user.email}`,
            );
            await supabaseAdmin.from("recall_calendars_v2").insert({
              id: existingCalendar.id,
              profile_id: user.id,
              platform: "google_calendar",
              created_at: existingCalendar.created_at,
              updated_at:
                existingCalendar.updated_at || existingCalendar.created_at,
            });
          } else if (existingDbCalendar.id !== existingCalendar.id) {
            logger.info(
              `Updating recall_calendars_v2 entry for user ${user.email}`,
            );
            await supabaseAdmin
              .from("recall_calendars_v2")
              .update({
                id: existingCalendar.id,
              })
              .eq("id", existingDbCalendar.id);
          }
        } else {
          logger.info(`No existing calendar found for ${user.email}`);
        }

        // Update user app_metadata
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            app_metadata: metadataUpdate,
          });

        if (updateError) {
          logger.error(`Failed to update user ${user.id}:`, updateError);
          continue;
        }

        logger.info(`Successfully updated user ${user.email}`);
      } catch (userError) {
        logger.error(`Error processing user ${user.id}:`, userError);
        // Continue with next user
      }
    }

    logger.info("Script completed successfully");
  } catch (error) {
    logger.error("Script failed:", error);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
