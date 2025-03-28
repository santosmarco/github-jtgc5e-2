import {
  AlertCircle,
  Bot,
  BotOff,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { RouterOutputs } from "~/trpc/react";

type MeetingBot =
  RouterOutputs["calendar"]["getCalendarEvents"][number]["meeting_bot"];

export type BotStatusVariant =
  | "success"
  | "warning"
  | "error"
  | "primary"
  | "muted";

export type BotStatusInfoStyles = {
  border: string;
  text: string;
};

export type BotStatusInfo = {
  variant: BotStatusVariant;
  badge: string;
  message: string | null;
  icon: LucideIcon;
  styles: BotStatusInfoStyles;
};

type StatusInfoFactoryArgs = {
  success: [];
  warning: [message: string];
  error: [message: string];
  primary: [badge: string, message: string, icon?: LucideIcon];
  muted: [badge: string, message: string, icon?: LucideIcon];
};

const statusInfoFactories = {
  success: (): BotStatusInfo => ({
    variant: "success",
    badge: "Completed",
    message: null,
    icon: CheckCircle2,
    styles: { border: "border-emerald-500/40", text: "text-emerald-500" },
  }),
  warning: (message: string): BotStatusInfo => ({
    variant: "warning",
    badge: "Skipped",
    message,
    icon: AlertCircle,
    styles: { border: "border-yellow-500/40", text: "text-yellow-500" },
  }),
  error: (message: string): BotStatusInfo => ({
    variant: "error",
    badge: "Failed",
    message,
    icon: BotOff,
    styles: { border: "border-destructive/40", text: "text-destructive" },
  }),
  primary: (badge: string, message: string, icon = Clock): BotStatusInfo => ({
    variant: "primary",
    badge,
    message,
    icon,
    styles: { border: "border-primary/40", text: "text-primary" },
  }),
  muted: (badge: string, message: string, icon = Bot): BotStatusInfo => ({
    variant: "muted",
    badge,
    message,
    icon,
    styles: { border: "border-border", text: "text-muted-foreground" },
  }),
} satisfies {
  [K in BotStatusVariant]: (...args: StatusInfoFactoryArgs[K]) => BotStatusInfo;
};

/**
 * Determines the status information for a meeting bot based on its current state
 * and whether it should join a meeting.
 *
 * @param meetingBot - The meeting bot data from the API response
 * @param shouldJoin - Whether the bot is configured to join the meeting
 * @returns Standardized status information for UI display
 */
export function getBotStatusInfo(
  meetingBot: MeetingBot,
  shouldJoin = false,
  isInPast = false,
): BotStatusInfo {
  // Bot not present or not configured
  if (!meetingBot) {
    if (shouldJoin) {
      return statusInfoFactories.primary(
        "Scheduled",
        "Will join when meeting starts",
      );
    }

    if (isInPast) {
      return statusInfoFactories.warning("Skipped due to settings");
    }

    return statusInfoFactories.muted("Disabled", "Recording disabled", BotOff);
  }

  // Bot has successfully recorded the meeting
  if (meetingBot.api_video_id) {
    return statusInfoFactories.success();
  }

  // Map of sub_codes to their corresponding status information
  const subCodeMap: Record<string, BotStatusInfo> = {
    // Error states
    meeting_not_found: statusInfoFactories.error("Meeting not found"),
    zoom_sdk_app_not_published: statusInfoFactories.error(
      "Zoom SDK error, please reach out",
    ),

    // Warning states - timeouts
    timeout_exceeded_everyone_left: statusInfoFactories.warning(
      "Recording stopped: Everyone left the meeting",
    ),
    timeout_exceeded_waiting_room: statusInfoFactories.warning(
      "Timed out in waiting room",
    ),
    timeout_exceeded_noone_joined: statusInfoFactories.warning(
      "No one joined the meeting",
    ),
    call_ended_by_platform_waiting_room_timeout: statusInfoFactories.warning(
      "Bot timed out in waiting room",
    ),

    // Warning states - bot removal
    bot_kicked_from_call: statusInfoFactories.warning(
      "Bot was kicked from the call",
    ),
    bot_kicked_from_waiting_room: statusInfoFactories.warning(
      "Bot was removed from the waiting room",
    ),
    bot_received_leave_call: statusInfoFactories.warning(
      "Bot was instructed to leave the call",
    ),
    call_ended_by_host: statusInfoFactories.warning(
      "Call was ended by the host",
    ),
  };

  // Return the mapped status if available
  if (meetingBot.sub_code && meetingBot.sub_code in subCodeMap) {
    const status = subCodeMap[meetingBot.sub_code];
    if (status) return status;
  }

  const errorCodeMap: Record<string, BotStatusInfo> = {
    // Error states
    "Cannot join meeting : MeetingNotExist":
      statusInfoFactories.error("Meeting not found"),

    // Warning states
    "Waiting for host timeout": statusInfoFactories.warning(
      "Timed out waiting for host to start meeting",
    ),
    "Cannot join meeting : EnforceLogin": statusInfoFactories.warning(
      "Meeting requires login authentication",
    ),
    "Meeting ended before record : ApiRequest": statusInfoFactories.warning(
      "Meeting ended before recording could start",
    ),
    TimeoutWaitingToStart: statusInfoFactories.warning(
      "Timed out waiting for meeting to start",
    ),
    "Maybe the end user does not have the setting enabled for recording":
      statusInfoFactories.warning("Recording permissions not enabled by host"),
    "Cannot join meeting : MeetingOver": statusInfoFactories.warning(
      "Meeting was already over",
    ),
    "Recording rights not granted": statusInfoFactories.warning(
      "Recording permissions not granted",
    ),
    "The meeting ended before the bot could participate":
      statusInfoFactories.warning("Meeting ended before bot could join"),
  };

  // Return the mapped status if available
  if (meetingBot.error_code && meetingBot.error_code in errorCodeMap) {
    const status = errorCodeMap[meetingBot.error_code];
    if (status) return status;
  }

  // Default case for unknown subcodes
  return statusInfoFactories.muted(
    "Unknown",
    meetingBot.sub_code
      ? `Unknown status: ${meetingBot.sub_code}`
      : meetingBot.error_code
        ? `Unknown status: ${meetingBot.error_code}`
        : "Unknown status",
  );
}
