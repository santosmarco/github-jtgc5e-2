import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

import { Badge } from "~/components/ui/badge";

import {
  AnimatedBadge,
  CompactContainer,
  ContentSection,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { EntityObservationData, SourceProps } from "./SourceItemFactory";

export function EntityObservationSource({
  data,
  compact = false,
}: SourceProps<EntityObservationData>) {
  if (compact) {
    return (
      <CompactContainer icon={<MessageSquare className="h-3.5 w-3.5" />}>
        <div className="line-clamp-1 text-xs">
          <span className="font-medium text-primary/90">
            {data.data.entity.name}:
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
        title={data.data.entity.name}
        badge={
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              delay: 0.1,
            }}
          >
            <Badge
              variant="outline"
              className="h-5 bg-primary/10 px-1.5 text-[11px] font-medium tracking-wide shadow-sm"
            >
              {data.data.entity.type}
            </Badge>
          </motion.div>
        }
      />

      <ContentSection className="border border-primary/15">
        <motion.div
          className="mb-1 text-[11px] font-medium text-primary/80"
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
