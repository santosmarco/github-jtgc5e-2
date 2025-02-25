import { ChevronDown, ChevronUp, GoalIcon, PencilIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

type GoalHeaderProps = {
  goal: Tables<"goals"> | null | undefined;
  videoCount: number;
  momentCount: number;
  commentCount: number;
  isExpanded: boolean;
  onExpand: (goalId: string) => void;
  onEdit: (goal: Tables<"goals">) => void;
};

export const GoalHeader = ({
  goal,
  videoCount,
  momentCount,
  commentCount,
  isExpanded,
  onExpand,
  onEdit,
}: GoalHeaderProps) => {
  if (!goal) return null;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expansion when clicking edit
    onEdit(goal);
  };

  return (
    <button
      className="flex w-full cursor-pointer items-start justify-between rounded-lg border border-transparent p-4 text-left transition-all hover:border-border hover:bg-muted/20"
      onClick={() => onExpand(goal.id)}
      type="button"
    >
      <div className="flex items-start gap-4">
        <div className="mt-1 rounded-full bg-muted p-2">
          <GoalIcon className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{goal.text}</h1>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            based on {videoCount} meetings • {momentCount} moments •{" "}
            {commentCount} comments
          </p>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={handleEditClick}
            type="button"
            className="h-8 w-8"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            <span className="sr-only">Edit Goal</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit Goal</TooltipContent>
      </Tooltip>
    </button>
  );
};
