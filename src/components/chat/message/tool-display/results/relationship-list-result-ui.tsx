"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon, LinkIcon, type LucideIcon } from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { Badge } from "~/components/ui/badge";
import type {
  EntitySemanticSearchToolOutput,
  FindEntityRelationshipsToolOutput,
} from "~/lib/processing/ai-search-tools";

type RelationshipItem =
  | NonNullable<
      EntitySemanticSearchToolOutput["results"]
    >["relationships"][number]
  | NonNullable<FindEntityRelationshipsToolOutput["relationships"]>[number];

function extractStandardRelationshipFields(
  entityName: string | undefined,
  relationship: RelationshipItem,
) {
  let subject =
    "subject" in relationship ? relationship.subject : relationship.entityName;
  let object =
    "object" in relationship ? relationship.object : relationship.otherEntity;

  if (entityName && "direction" in relationship) {
    subject =
      relationship.direction === "outgoing"
        ? entityName
        : relationship.otherEntity;
    object =
      relationship.direction === "outgoing"
        ? relationship.otherEntity
        : entityName;
  }

  const relationshipType =
    "relationshipType" in relationship
      ? relationship.relationshipType
      : relationship.relationship;
  const confidence = relationship.confidence;
  const topicTitle = relationship.topicTitle;
  const observations =
    "observations" in relationship ? relationship.observations : null;

  return {
    subject,
    object,
    relationshipType,
    confidence,
    topicTitle,
    observations,
  };
}

type RelationshipItemStandardized = ReturnType<
  typeof extractStandardRelationshipFields
>;

export type RelationshipCardProps = {
  relationship: RelationshipItemStandardized;
  index: number;
  parentKey: string; // Unique key prefix for items within this card
};

export function RelationshipCard({
  relationship,
  index,
  parentKey,
}: RelationshipCardProps) {
  const {
    subject,
    object,
    relationshipType,
    confidence,
    topicTitle,
    observations,
  } = relationship;

  const cardVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 25,
        delay: index * 0.08,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="rounded-lg border border-border bg-card p-3.5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
    >
      <div className="flex flex-col space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          <span className="font-medium text-foreground">
            {subject || "N/A"}
          </span>
          <ArrowRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
          <Badge
            variant="default"
            className="border border-primary/10 bg-primary/15 text-xs text-primary-foreground hover:bg-primary/20"
          >
            {relationshipType}
          </Badge>
          <ArrowRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
          <span className="font-medium text-foreground">{object || "N/A"}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {confidence && (
            <Badge
              variant="outline"
              className="border-dashed text-xs text-muted-foreground"
            >
              Confidence: {(confidence * 100).toFixed(0)}%
            </Badge>
          )}

          {topicTitle && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LinkIcon className="h-3 w-3 flex-shrink-0" />
              <span>Topic: {topicTitle}</span>
            </div>
          )}
        </div>

        {observations && observations.length > 0 && (
          <div className="pt-1">
            <details className="group text-xs">
              <summary className="flex cursor-pointer items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                <span className="transition-transform group-open:rotate-90">
                  ▶
                </span>
                Show {observations.length} observation
                {observations.length !== 1 ? "s" : ""}
              </summary>

              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground/80 marker:text-primary/40">
                {observations.map((obs, i) => (
                  <li key={`${parentKey}-obs-${i}`} className="leading-relaxed">
                    {obs}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export type RelationshipListResultUIProps = {
  relationships: RelationshipItem[];
  title: string;
  entityName?: string;
  icon?: LucideIcon;
  totalCount?: number;
  args?: Record<string, unknown>;
  id?: string; // Unique ID for this instance of the list
};

export function RelationshipListResultUI({
  relationships,
  title,
  entityName,
  icon: SectionIcon = LinkIcon,
  totalCount,
  args,
  id = "rel-list-fallback", // Default id for the list itself
}: RelationshipListResultUIProps) {
  const relationshipsData = relationships.map((rel) =>
    extractStandardRelationshipFields(entityName, rel),
  );

  if (!relationships?.length) {
    return (
      <CollapsibleSection
        title={title}
        icon={SectionIcon}
        count={0}
        args={args}
        defaultOpen={true}
      >
        <p className="p-3 text-sm text-muted-foreground">
          No relationships found.
        </p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={title}
      icon={SectionIcon}
      count={totalCount ?? relationships.length}
      args={args}
      defaultOpen={true}
    >
      <div className="space-y-2 p-2">
        {relationshipsData.map((rel, index) => {
          const cardKey = `${id}-${rel.subject ?? "nosubj"}-${rel.relationshipType}-${rel.object ?? "noobj"}-${index}`;

          return (
            <RelationshipCard
              key={cardKey}
              relationship={rel}
              index={index}
              parentKey={cardKey} // Pass the unique card key for internal list items
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
