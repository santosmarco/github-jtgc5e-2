import { motion } from "framer-motion";
import _ from "lodash";
import { Calendar, Clock, TrendingUpIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import type { ListMeetingsToolOutput } from "~/lib/ai/tools";
import { cn } from "~/lib/utils";

interface ChatMeetingListProps {
  meetings: ListMeetingsToolOutput["data"];
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

const hoverVariants = {
  initial: { scale: 1, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" },
  hover: {
    scale: 1.02,
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)",
    borderColor: "rgba(var(--primary-rgb), 0.3)",
  },
};

export function ChatMeetingList({ meetings, className }: ChatMeetingListProps) {
  if (!meetings?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Calendar className="h-4 w-4" />
        <span>No meetings found</span>
      </motion.div>
    );
  }

  const sortedMeetings = _.orderBy(
    meetings,
    [(m) => (m.date ? new Date(m.date).getTime() : 0)],
    ["desc"],
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2", className)}
    >
      {sortedMeetings.map((meeting) => (
        <motion.div
          key={meeting.id}
          variants={itemVariants}
          whileHover="hover"
          initial="initial"
          onClick={() => {
            window.open(`/videos/${meeting.id}`, "_blank");
          }}
          className="group flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/50 bg-background/50 px-3 py-2 transition-colors hover:border-primary/20"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="truncate text-sm font-medium group-hover:text-primary">
                {meeting.name}
              </h4>
              {meeting.momentIds && meeting.momentIds.length > 0 && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 border border-primary/20 text-xs"
                >
                  <TrendingUpIcon className="h-3 w-3" />
                  {meeting.momentIds.length}
                </Badge>
              )}
            </div>
            {meeting.date && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Clock className="h-3 w-3" />
                <time dateTime={meeting.date}>
                  {new Date(meeting.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </motion.div>
            )}
          </div>

          {/* Hover Effect Overlay */}
          <motion.div
            className="absolute inset-0 rounded-md"
            variants={hoverVariants}
            style={{ zIndex: -1 }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
