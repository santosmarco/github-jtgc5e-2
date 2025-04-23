import type { RouterOutputs } from "~/trpc/shared";

import { ActionItemSource } from "./ActionItemSource";
import { EntityObservationSource } from "./EntityObservationSource";
import { EntitySource } from "./EntitySource";
import { MeetingSource } from "./MeetingSource";
import { MomentSource } from "./MomentSource";
import { RelationshipObservationSource } from "./RelationshipObservationSource";
import { RelationshipSource } from "./RelationshipSource";
import { TopicDiscussedSource } from "./TopicDiscussedSource";
import { TopicObservationSource } from "./TopicObservationSource";
import { TopicSource } from "./TopicSource";
import { UnknownSource } from "./UnknownSource";

// Type definitions for source data
export type SourceData =
  RouterOutputs["sessionAnnotations"]["getSourceDetails"];
export type MomentData = Extract<SourceData, { type: "moment" }>;
export type EntityData = Extract<SourceData, { type: "entity" }>;
export type RelationshipData = Extract<SourceData, { type: "relationship" }>;
export type EntityObservationData = Extract<
  SourceData,
  { type: "entity_observation" }
>;
export type RelationshipObservationData = Extract<
  SourceData,
  { type: "relationship_observation" }
>;
export type TopicObservationData = Extract<
  SourceData,
  { type: "topic_observation" }
>;
export type TopicData = Extract<SourceData, { type: "topic" }>;
export type TopicDiscussedData = Extract<
  SourceData,
  { type: "topic_discussed" }
>;
export type ActionItemData = Extract<SourceData, { type: "action_item" }>;
export type MeetingData = Extract<SourceData, { type: "meeting" }>;

/**
 * Generic props interface for all source components
 */
export interface SourceProps<T = SourceData> {
  data: T;
  compact?: boolean;
}

interface SourceItemFactoryProps {
  data: SourceData;
  compact?: boolean;
}

/**
 * Factory component that renders the appropriate source component based on type
 */
export function SourceItemFactory({
  data,
  compact = false,
}: SourceItemFactoryProps) {
  // Select the appropriate component based on source type
  switch (data.type) {
    case "moment":
      return <MomentSource data={data} compact={compact} />;
    case "entity":
      return <EntitySource data={data} compact={compact} />;
    case "relationship":
      return <RelationshipSource data={data} compact={compact} />;
    case "entity_observation":
      return <EntityObservationSource data={data} compact={compact} />;
    case "relationship_observation":
      return <RelationshipObservationSource data={data} compact={compact} />;
    case "topic_observation":
      return <TopicObservationSource data={data} compact={compact} />;
    case "topic":
      return <TopicSource data={data} compact={compact} />;
    case "topic_discussed":
      return <TopicDiscussedSource data={data} compact={compact} />;
    case "action_item":
      return <ActionItemSource data={data} compact={compact} />;
    case "meeting":
      return <MeetingSource data={data} compact={compact} />;
    default:
      return <UnknownSource compact={compact} />;
  }
}
