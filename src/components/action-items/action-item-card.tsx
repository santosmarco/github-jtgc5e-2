"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type ActionItem = NonNullable<
  RouterOutputs["actionItems"]["getByVideoId"]
>[number];

export type ActionItemCardProps = {
  item: ActionItem;
  onDelete: () => void;
  onToggleComplete: (completed: boolean) => void;
};

export function ActionItemCard({
  item,
  onDelete,
  onToggleComplete,
}: ActionItemCardProps) {
  const dueDate =
    item.due_date && !item.completed_at ? dayjs(item.due_date) : null;
  const isOverdue = dueDate?.isBefore(dayjs());
  const isCompleted = !!item.completed_at;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "group relative flex items-start gap-2 border-0 border-none bg-transparent px-2 py-1 transition-colors",
          item.assignees.length <= 0 && "pb-1",
        )}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="pl-0.5"
        >
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-4 w-4 shrink-0"
            onClick={() => onToggleComplete(!isCompleted)}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
          </Button>
        </motion.div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "text-sm",
                isCompleted && "text-muted-foreground line-through",
              )}
            >
              {item.text}
            </motion.p>

            {dueDate && (
              <motion.div
                className={cn(
                  "flex shrink-0 items-center justify-center gap-0.5 rounded-full bg-accent/50 px-2 py-0.5 text-xs text-muted-foreground transition-transform duration-200 group-hover:-translate-x-5",
                  isOverdue && "bg-destructive/10 font-medium text-destructive",
                )}
              >
                {dueDate.format("MMM D, YYYY")}
              </motion.div>
            )}
          </div>

          {item.assignees.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-1.5 flex flex-wrap gap-1"
            >
              {item.assignees.map(({ assignee }, idx) => (
                <motion.span
                  key={assignee.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {assignee.name}
                </motion.span>
              ))}
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute right-1 top-1"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:bg-transparent hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </motion.div>
      </Card>
    </motion.div>
  );
}
