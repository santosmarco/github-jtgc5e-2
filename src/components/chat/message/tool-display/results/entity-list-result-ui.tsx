"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BookTextIcon,
  DatabaseIcon,
  PresentationIcon as MeetingTitleIcon,
  ComponentIcon as RelatedEntityIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { Badge } from "~/components/ui/badge";
import type {
  DiscoverKeyEntitiesToolOutput,
  EntitySemanticSearchToolOutput,
} from "~/lib/processing/ai-search-tools";

type EntityItem =
  | NonNullable<EntitySemanticSearchToolOutput["results"]>["entities"][number]
  | NonNullable<DiscoverKeyEntitiesToolOutput["entities"]>[number];

export type EntityCardProps = {
  entity: EntityItem;
  index: number;
};

export function EntityCard({ entity, index }: EntityCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: index * 0.07,
      },
    },
  };

  const entityConfidence =
    "confidence" in entity && entity.confidence
      ? entity.confidence
      : "score" in entity && entity.score
        ? entity.score
        : undefined;

  const Icon = getEntityIcon(entity.type);

  const meetingOrTopicTitle =
    ("meetingTitle" in entity && entity.meetingTitle) ||
    ("topicTitle" in entity && entity.topicTitle);
  const relatedEntities =
    "relatedEntities" in entity && Array.isArray(entity.relatedEntities)
      ? entity.relatedEntities
      : null;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="flex w-full flex-col space-y-2 rounded-lg border border-border bg-card p-3.5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4.5 w-4.5 flex-shrink-0 text-primary" />
          <h5 className="text-sm font-semibold text-foreground">
            {entity.name}
          </h5>
        </div>
        <Badge
          variant="outline"
          className="flex-shrink-0 whitespace-nowrap border-border/50 text-xs"
        >
          {entity.type}
        </Badge>
      </div>

      {entity.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/90">
          {entity.description}
        </p>
      )}

      {meetingOrTopicTitle && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MeetingTitleIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{meetingOrTopicTitle}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {entityConfidence && (
          <Badge
            variant="secondary"
            className="border-none bg-primary/10 text-xs text-primary-foreground/90"
          >
            Confidence: {(entityConfidence * 100).toFixed(0)}%
          </Badge>
        )}
        {"mentionCount" in entity && entity.mentionCount !== undefined && (
          <Badge
            variant="outline"
            className="border-primary/20 text-xs text-muted-foreground"
          >
            {entity.mentionCount} mentions
          </Badge>
        )}
      </div>

      {relatedEntities && relatedEntities.length > 0 && (
        <div className="pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <RelatedEntityIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            {relatedEntities.slice(0, 3).map((relEntity, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-muted/80 font-normal"
              >
                {typeof relEntity === "string" ? relEntity : "Unknown Entity"}
              </Badge>
            ))}
            {relatedEntities.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal">
                + {relatedEntities.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export type EntityListResultUIProps = {
  entities: EntityItem[];
  title: string;
  icon?: LucideIcon; // Optional override for section icon
  totalCount?: number;
  args?: Record<string, unknown>;
  id?: string; // Added id prop for unique key generation context
};

export function EntityListResultUI({
  entities,
  title,
  icon: SectionIcon = DatabaseIcon, // Default to DatabaseIcon
  totalCount,
  args,
  id = "entity-list-fallback", // Provide a default value for id
}: EntityListResultUIProps) {
  if (!entities?.length) {
    return (
      <CollapsibleSection
        title={title}
        icon={SectionIcon}
        count={0}
        args={args}
        defaultOpen={true}
      >
        <p className="p-3 text-sm text-muted-foreground">No entities found.</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={title}
      icon={SectionIcon}
      count={totalCount ?? entities.length}
      args={args}
      defaultOpen={true}
    >
      <div className="flex flex-wrap gap-2 py-2">
        {entities.map((entity, index) => (
          <EntityCard
            key={`${id}-${entity.name}-${entity.type}-${index}`}
            entity={entity}
            index={index}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function getEntityIcon(type: string): LucideIcon {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("person") || normalizedType.includes("people"))
    return UsersIcon;
  if (normalizedType.includes("project") || normalizedType.includes("task"))
    return BookTextIcon;
  if (normalizedType.includes("organization")) return UsersIcon; // Could be a building icon too
  // Add more specific icons as needed
  return TagIcon; // Fallback icon
}
