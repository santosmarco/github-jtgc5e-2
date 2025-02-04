import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import type { Tables } from "~/lib/supabase/database.types";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { ReportMomentList } from "./report-moment-list";

type MomentWithSignal = Tables<"report_moments"> & { moment: VideoMoment };

type ReportSignalGroupProps = {
  signal: Tables<"report_goal_signals">;
  moments: MomentWithSignal[];
  signalDirection: "positive" | "negative";
  onHideMoment: (momentId: string) => void;
};

export function ReportSignalGroup({
  signal,
  moments,
  signalDirection,
  onHideMoment,
}: ReportSignalGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-md border border-border bg-background/50 px-4 py-3 shadow-sm">
        <span className="text-sm font-medium">
          <span className="text-muted-foreground">
            Because you have defined
          </span>{" "}
          <span className="text-foreground">&ldquo;{signal.text}&rdquo;</span>{" "}
          <span className="text-muted-foreground">as a {signalDirection}</span>
          {signalDirection === "positive" ? (
            <ArrowUpRightIcon className="inline h-4 w-4 text-xs text-emerald-700 dark:text-emerald-400" />
          ) : (
            <ArrowDownRightIcon className="inline h-4 w-4 text-xs text-red-700 dark:text-red-400" />
          )}{" "}
          <span className="text-muted-foreground">signal</span>
        </span>
      </div>
      <ReportMomentList
        moments={moments}
        signalDirection={signalDirection}
        reportGoalSignals={[signal]}
        onHideMoment={onHideMoment}
        hideSignalExplanation
      />
    </div>
  );
}
