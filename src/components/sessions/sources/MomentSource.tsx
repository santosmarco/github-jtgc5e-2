import { motion } from "framer-motion";
import { CalendarClock, Target } from "lucide-react";

import {
  AnimatedBadge,
  CompactContainer,
  ContentSection,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { MomentData, SourceProps } from "./SourceItemFactory";

export function MomentSource({
  data,
  compact = false,
}: SourceProps<MomentData>) {
  if (compact) {
    return (
      <CompactContainer icon={<Target className="h-3.5 w-3.5" />}>
        <span className="truncate text-xs font-medium">
          {data.data.title || "Moment"}
        </span>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<Target className="h-3.5 w-3.5" />}
        title={data.data.title || "Moment"}
        badge={<AnimatedBadge>Moment</AnimatedBadge>}
        subtitle={
          data.data.startTimestamp && (
            <div className="text-xs text-muted-foreground">
              <motion.div
                className="flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                <CalendarClock className="h-3 w-3" />
                <span>
                  {new Date(data.data.startTimestamp).toLocaleTimeString(
                    undefined,
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </motion.div>
            </div>
          )
        }
      />

      {data.data.summary && (
        <ContentSection>
          <p className="text-sm text-foreground">{data.data.summary}</p>
        </ContentSection>
      )}
    </SourceContainer>
  );
}
