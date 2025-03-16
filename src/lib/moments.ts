import type { LucideIcon } from "lucide-react";
import {
  BrainIcon,
  GoalIcon,
  HeartIcon,
  MessageSquareIcon,
  PyramidIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import type { Badge } from "~/components/ui/badge";
import type { VideoMoment } from "~/lib/schemas/video-moment";

export type MomentStyles = {
  activityTypeBadge?: React.ComponentProps<typeof Badge>;
};

export function getMomentStyles(
  moment: Pick<VideoMoment, "activity" | "activity_type">,
) {
  const styles: MomentStyles = {};

  if (moment.activity === "Emotion") {
    styles.activityTypeBadge = {
      color: getColorFromRanking(moment.activity_type),
    };
  }

  return styles;
}

function getColorFromRanking(ranking: string | null | undefined) {
  if (!ranking) {
    return "primary";
  }
  const [numerator, denominator] = ranking.split("/").map(Number);
  if (numerator === undefined || denominator === undefined) {
    return "primary";
  }
  const score = numerator / denominator;

  if (score >= 0.8) return "success";
  if (score >= 0.7) return "primary";
  if (score >= 0.6) return "warning";
  return "destructive";
}

export function getMomentIcon(
  moment: Pick<VideoMoment, "activity">,
): LucideIcon;
export function getMomentIcon(activity: string): LucideIcon;
export function getMomentIcon(
  momentOrActivity: Pick<VideoMoment, "activity"> | string,
): LucideIcon {
  return (
    {
      "Decision Making": BrainIcon,
      Delegation: PyramidIcon,
      Emotion: HeartIcon,
      Feedback: MessageSquareIcon,
      "Goal Setting": GoalIcon,
      "Team Conflict": UsersIcon,
      Coach: UserIcon,
    }[
      typeof momentOrActivity === "string"
        ? momentOrActivity
        : momentOrActivity.activity
    ] ?? BrainIcon
  );
}
