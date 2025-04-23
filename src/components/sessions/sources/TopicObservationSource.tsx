import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

import {
  CompactContainer,
  ContentSection,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { SourceProps, TopicObservationData } from "./SourceItemFactory";

export function TopicObservationSource({
  data,
  compact = false,
}: SourceProps<TopicObservationData>) {
  if (compact) {
    return (
      <CompactContainer icon={<MessageSquare className="h-3.5 w-3.5" />}>
        <div className="line-clamp-1 text-xs">
          <span className="font-medium text-primary/90">
            {data.data.topic.title}:
          </span>{" "}
          <span className="text-muted-foreground">{data.data.observation}</span>
        </div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        title={data.data.topic.title}
        subtitle={
          <motion.p
            className="mt-1 line-clamp-2 text-xs leading-normal text-muted-foreground"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {data.data.topic.summary}
          </motion.p>
        }
      />

      <ContentSection className="border-l-2 border-primary shadow-sm">
        <motion.div
          className="mb-1 text-[11px] font-medium text-primary/90"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Observation
        </motion.div>
        <p className="text-xs leading-relaxed text-foreground/90">
          {data.data.observation}
        </p>
      </ContentSection>
    </SourceContainer>
  );
}
