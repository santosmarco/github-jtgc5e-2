"use client";

import { motion } from "framer-motion";
import { EyeIcon, MessageSquareIcon } from "lucide-react"; // Using MessageSquare for observations

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { Badge } from "~/components/ui/badge";

type ObservationItem = {
  observation: string;
  topicTitle?: string;
  confidence?: number;
  // Add other relevant fields from the actual Observation type if needed
};

export type ObservationCardProps = {
  observationItem: ObservationItem;
  index: number;
};

export function ObservationCard({
  observationItem,
  index,
}: ObservationCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: index * 0.05,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="rounded-md border border-border bg-card p-2.5 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <MessageSquareIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sky-500" />
        <div className="flex-1">
          <p className="text-xs text-foreground/90">
            {observationItem.observation}
          </p>
        </div>
        {observationItem.confidence !== undefined && (
          <Badge
            variant="outline"
            className="ml-2 self-start whitespace-nowrap border-dashed text-xs"
          >
            {(observationItem.confidence * 100).toFixed(0)}%
          </Badge>
        )}
      </div>

      {observationItem.topicTitle && (
        <div className="flex items-start gap-2">
          <div className="h-3.5 w-3.5 flex-shrink-0">
            {/* Spacer for icon alignment */}
          </div>
          <p className="flex-1 text-xs text-muted-foreground">
            Topic:{" "}
            <span className="font-medium">{observationItem.topicTitle}</span>
          </p>
        </div>
      )}
    </motion.div>
  );
}

export type ObservationListResultUIProps = {
  observations: ObservationItem[];
  title?: string;
  icon?: React.ElementType;
  totalCount?: number;
  args?: Record<string, unknown>;
};

export function ObservationListResultUI({
  observations,
  title = "Found Observations",
  icon: SectionIcon = EyeIcon, // Default to EyeIcon
  totalCount,
  args,
}: ObservationListResultUIProps) {
  if (!observations || observations.length === 0) {
    return (
      <CollapsibleSection
        title={title}
        icon={SectionIcon}
        count={0}
        args={args}
        defaultOpen={true}
      >
        <p className="p-3 text-sm text-muted-foreground">
          No observations found.
        </p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={title}
      icon={SectionIcon}
      count={totalCount ?? observations.length}
      args={args}
      defaultOpen={true}
    >
      <div className="space-y-1.5 p-2">
        {observations.map((obs, index) => (
          <ObservationCard
            key={`obs-${index}-${obs.observation.substring(0, 10)}`}
            observationItem={obs}
            index={index}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}
