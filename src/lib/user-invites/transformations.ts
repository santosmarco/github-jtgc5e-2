import type { Merge } from "type-fest";

import type { Tables } from "../supabase/database.types";

export function transformUserInviteIntoProfile(
  userInvite: Tables<"user_invites"> & {
    invited_by_profile: Tables<"profiles"> | null;
  },
): Merge<
  Tables<"profiles">,
  { id: string | null; coach: Tables<"profiles">[] }
> {
  return {
    id: null,
    nickname: [userInvite.first_name, userInvite.last_name]
      .filter(Boolean)
      .join(" "),
    email: userInvite.email,
    is_admin: false,
    role: userInvite.role ?? "user",
    coach_id: userInvite.invited_by_profile?.id ?? null,
    coach: userInvite.invited_by_profile ? [userInvite.invited_by_profile] : [],
    company: userInvite.company,
    created_at: userInvite.created_at,
    updated_at: userInvite.created_at,
    status: "pending",
    did_complete_onboarding: false,
    did_complete_post_ten_meeting_onboarding: false,
    force_post_ten_meeting_onboarding: false,
    explore_email_sent: false,
    image_url: null,
    viewing_as_id: null,
  };
}
