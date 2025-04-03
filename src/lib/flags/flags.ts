import type { Enums } from "../supabase/database.types";

export const Flag = {
  ALLOW_ADMIN_ACCESS: "allow_admin_access",
  ALLOW_REPORT_SECTION_DEBUG_DISPLAY: "allow_report_section_debug_display",
  ALLOW_INVITE_AS_COACH: "allow_invite_as_coach",
  ALLOW_LIST_ALL_USERS: "allow_list_all_users",
  ALLOW_LOAD_ALL_CLIENTS: "allow_load_all_clients",
  ALLOW_QA_MODE: "allow_qa_mode",
  ALLOW_VIDEO_DEBUG_DISPLAY: "allow_video_debug_display",
  ALLOW_MEETING_DELETE: "allow_meeting_delete",
  ALLOW_CLIENT_ACCESS: "allow_client_access",
} as const;

export type Flag = (typeof Flag)[keyof typeof Flag];

export const ROLE_FLAGS: Record<Enums<"user_role_enum">, readonly Flag[]> = {
  user: [Flag.ALLOW_MEETING_DELETE],

  coach: [Flag.ALLOW_CLIENT_ACCESS],

  admin: [
    Flag.ALLOW_ADMIN_ACCESS,
    Flag.ALLOW_REPORT_SECTION_DEBUG_DISPLAY,
    Flag.ALLOW_INVITE_AS_COACH,
    Flag.ALLOW_LIST_ALL_USERS,
    Flag.ALLOW_LOAD_ALL_CLIENTS,
    Flag.ALLOW_QA_MODE,
    Flag.ALLOW_VIDEO_DEBUG_DISPLAY,
    Flag.ALLOW_MEETING_DELETE,
    Flag.ALLOW_CLIENT_ACCESS,
  ],
};

/**
 * Flag hierarchy defining inheritance relationships
 * Each role inherits flags from the roles listed in its array
 */
export const FLAG_HIERARCHY: Readonly<
  Record<Enums<"user_role_enum">, readonly Enums<"user_role_enum">[]>
> = {
  admin: ["coach", "user"],
  coach: ["user"],
  user: [],
};

/**
 * Gets all flags for a role including those inherited from parent roles
 * @param role - The user role to get flags for
 * @returns Array of all flags available to the specified role
 */
export function getAllFlagsForRole(
  role: Enums<"user_role_enum">,
): readonly Flag[] {
  const inheritedRoles = FLAG_HIERARCHY[role];
  const inheritedFlags = inheritedRoles.flatMap((r) => ROLE_FLAGS[r]);

  return [...new Set([...ROLE_FLAGS[role], ...inheritedFlags])];
}

/**
 * Checks if a user with the given role has access to the specified flags
 * @param role - The user role to check
 * @param requiredFlags - The flags to check for
 * @returns Boolean indicating if the user has all the required flags
 */
export function checkUserFlags(
  user: { flags: readonly Flag[] } | null | undefined,
  requiredFlags: readonly Flag[],
): boolean {
  if (!user) return false;
  return requiredFlags.every((flag) => user.flags.includes(flag));
}
