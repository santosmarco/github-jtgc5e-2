import { format } from "date-fns";
import { motion } from "framer-motion";
import { Calendar, CheckCircle, User } from "lucide-react";

import { Badge } from "~/components/ui/badge";

import {
  badgePulseAnimation,
  CompactContainer,
  ContentSection,
  itemVariants,
  MetadataItem,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { ActionItemData, SourceProps } from "./SourceItemFactory";

export function ActionItemSource({
  data,
  compact = false,
}: SourceProps<ActionItemData>) {
  if (compact) {
    return (
      <CompactContainer icon={<CheckCircle className="h-3.5 w-3.5" />}>
        <div className="flex gap-1.5 text-xs">
          <span className="line-clamp-1 font-medium">{data.data.text}</span>
          {data.data.isCompleted && (
            <motion.div animate={badgePulseAnimation}>
              <Badge
                variant="outline"
                className="bg-success/20 text-success h-4 shrink-0 px-1 text-[10px]"
              >
                ✓
              </Badge>
            </motion.div>
          )}
        </div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<CheckCircle className="h-3.5 w-3.5" />}
        title={data.data.text}
        badge={
          data.data.isCompleted && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                delay: 0.2,
              }}
            >
              <Badge
                variant="outline"
                className="bg-success/20 text-success h-5 shrink-0 px-1.5 text-[10px] font-medium"
              >
                Completed
              </Badge>
            </motion.div>
          )
        }
      />

      {data.data.dueDate && (
        <MetadataItem
          icon={<Calendar className="h-3 w-3 text-muted-foreground/70" />}
        >
          Due: {format(new Date(data.data.dueDate), "MMM d, yyyy")}
        </MetadataItem>
      )}

      {data.data.assignees?.length > 0 && (
        <ContentSection>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <User className="h-3 w-3 text-muted-foreground/70" />
            <span className="font-medium">Assignees</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {data.data.assignees.map((assignee) => (
              <motion.div
                key={assignee.id}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  delay: 0.3,
                }}
              >
                <Badge
                  variant="secondary"
                  className="h-5 bg-background px-2 text-[11px] font-medium shadow-sm"
                >
                  {assignee.assigneeId}
                </Badge>
              </motion.div>
            ))}
          </div>
        </ContentSection>
      )}
    </SourceContainer>
  );
}
