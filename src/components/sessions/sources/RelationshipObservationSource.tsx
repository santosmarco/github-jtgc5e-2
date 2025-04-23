import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

import { Badge } from "~/components/ui/badge";

import {
  CompactContainer,
  ContentSection,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type {
  RelationshipObservationData,
  SourceProps,
} from "./SourceItemFactory";

export function RelationshipObservationSource({
  data,
  compact = false,
}: SourceProps<RelationshipObservationData>) {
  if (compact) {
    return (
      <CompactContainer icon={<MessageSquare className="h-3.5 w-3.5" />}>
        <div className="line-clamp-1 text-xs">
          <span className="font-medium text-primary/90">
            {data.data.relationship.subjectEntityName} →{" "}
            {data.data.relationship.objectEntityName}:
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
        title="Relationship Observation"
      />

      <div className="flex flex-col items-start space-y-2">
        <div className="flex gap-1.5 text-xs">
          <motion.div
            initial={{ x: -3, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Badge
              variant="secondary"
              className="h-5 bg-background px-1.5 text-[11px] font-medium shadow-sm"
            >
              {data.data.relationship.subjectEntityName}
            </Badge>
          </motion.div>

          <motion.span
            className="text-muted-foreground/70"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: [0, 2, 0],
            }}
            transition={{
              opacity: { delay: 0.2, duration: 0.3 },
              x: {
                delay: 0.5,
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "mirror",
              },
            }}
          >
            →
          </motion.span>

          <motion.div
            initial={{ x: 3, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Badge
              variant="secondary"
              className="h-5 bg-background px-1.5 text-[11px] font-medium shadow-sm"
            >
              {data.data.relationship.objectEntityName}
            </Badge>
          </motion.div>
        </div>

        <motion.div
          className="self-start rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/15"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.3,
            type: "spring",
            stiffness: 500,
            damping: 25,
          }}
        >
          {data.data.relationship.relationshipType}
        </motion.div>
      </div>

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
