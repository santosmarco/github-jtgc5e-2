"use client";

import type { UIMessage } from "ai";
// Import Lucide icons (ensure these are used or adjust imports as needed)
import {
  BookOpen,
  Database,
  Eye,
  Link as LinkIcon,
  List as ListIcon,
  Users,
} from "lucide-react";

// Import existing list components (we'll create specific UI wrappers later)
import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { LoadingIndicator } from "~/components/chat/loading-indicator";
// Import type definitions for tool outputs
import type {
  ListMeetingsToolOutput,
  ListReportsToolOutput,
  SearchMomentsToolOutput,
  ThinkToolOutput,
} from "~/lib/ai/tools";
import type {
  DiscoverKeyEntitiesToolOutput,
  EntityLookupToolOutput,
  EntitySemanticSearchToolOutput,
  FindEntityRelationshipsToolOutput,
  FindRelatedTopicsToolOutput,
  ListEntityNamesToolOutput,
  ListEntityTypesToolOutput,
  ListRelationshipTypesToolOutput,
} from "~/lib/processing/ai-search-tools";
import type { VideoMoment } from "~/lib/schemas/video-moment";

import { AnalyzingMomentLoading } from "./loading/analyzing-moment-loading";
import { ListEntitiesLoading } from "./loading/list-entities-loading";
import { ListMeetingsLoading } from "./loading/list-meetings-loading";
import { ListRelationshipsLoading } from "./loading/list-relationships-loading";
import { ListReportsLoading } from "./loading/list-reports-loading";
import { SearchMomentsLoading } from "./loading/search-moments-loading";
// NEW: Import the specific loading component
import { ThinkingLoading } from "./loading/thinking-loading";
// NEW: Import remaining specific result UI components
import { DisplayMomentResultUI } from "./results/display-moment-result-ui";
// NEW: Import the specific entity list UI component
import { EntityListResultUI } from "./results/entity-list-result-ui";
// NEW: Import the specific result UI component
import { ListMeetingsResultUI } from "./results/list-meetings-result-ui";
// NEW: Import ObservationListResultUI
import { ObservationListResultUI } from "./results/observation-list-result-ui";
// NEW: Import the specific relationship list UI component
import { RelationshipListResultUI } from "./results/relationship-list-result-ui";
import { ReportListResultUI } from "./results/report-list-result-ui";
// NEW: Import the specific search moments UI component
import { SearchMomentsResultUI } from "./results/search-moments-result-ui";
import { SimpleListResultUI } from "./results/simple-list-result-ui";
import { ThinkResultUI } from "./results/think-result-ui";
// NEW: Import TopicListResultUI
import { TopicListResultUI } from "./results/topic-list-result-ui";

type ToolInvocationType = NonNullable<
  Extract<
    UIMessage["parts"][number],
    { type: "tool-invocation" }
  >["toolInvocation"]
>;

interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocationType;
}

// Placeholder for custom loading components (to be created)
const DefaultToolLoading = ({ message }: { message: string }) => (
  <LoadingIndicator message={message} />
);

const getToolLoadingMessage = (toolName: string): string => {
  const toolMessages: Record<string, string> = {
    displayMoment: "Analyzing moment...",
    listMeetings: "Searching across all your meetings...",
    searchMoments: "Finding relevant moments...",
    discoverKeyEntities: "Discovering key entities...",
    findEntityRelationships: "Finding entity relationships...",
    findRelatedTopics: "Finding related topics...",
    entityLookup: "Looking up entity information...",
    entitySemanticSearch: "Searching for relevant entities...",
    listEntityNames: "Listing entity names...",
    listRelationshipTypes: "Listing relationship types...",
    listEntityTypes: "Listing entity types...",
    listReports: "Finding reports...",
    think: "Thinking...",
  };

  return toolMessages[toolName] || "Processing...";
};

export function ToolInvocationDisplay({
  toolInvocation,
}: ToolInvocationDisplayProps) {
  return (
    <div className="rounded-lg border border-border">
      <ToolInvocationDisplayContent toolInvocation={toolInvocation} />
    </div>
  );
}

function ToolInvocationDisplayContent({
  toolInvocation,
}: ToolInvocationDisplayProps) {
  if (toolInvocation.state !== "result") {
    // Render specific loading indicators or a default one
    const loadingMessage = getToolLoadingMessage(toolInvocation.toolName);

    switch (toolInvocation.toolName) {
      case "think":
        return <ThinkingLoading />;
      case "listMeetings":
        return <ListMeetingsLoading />;
      case "searchMoments":
        return <SearchMomentsLoading />;
      case "displayMoment":
        return <AnalyzingMomentLoading />;
      case "discoverKeyEntities":
      case "entityLookup":
      case "entitySemanticSearch":
      case "listEntityNames":
      case "listEntityTypes":
        return <ListEntitiesLoading />;
      case "findEntityRelationships":
      case "listRelationshipTypes":
        return <ListRelationshipsLoading />;
      case "listReports":
        return <ListReportsLoading />;
      default:
        return <DefaultToolLoading message={loadingMessage} />;
    }
  }

  // Render result UI based on tool name
  switch (toolInvocation.toolName) {
    case "displayMoment": {
      const { id, moment, reasoning } = toolInvocation.result as {
        id: string;
        reasoning?: string;
        moment: VideoMoment;
      };

      if (!moment) return null;

      // Use new UI component
      return (
        <DisplayMomentResultUI
          id={id}
          moment={moment}
          reasoning={reasoning}
          args={toolInvocation.args as Record<string, unknown> | undefined}
        />
      );
    }

    case "listMeetings":
      return (
        <ListMeetingsResultUI
          data={(toolInvocation.result as ListMeetingsToolOutput).data}
          args={toolInvocation.args as Record<string, unknown> | undefined}
        />
      );

    case "searchMoments":
      return (
        <SearchMomentsResultUI
          results={(toolInvocation.result as SearchMomentsToolOutput).results}
          args={toolInvocation.args as Record<string, unknown> | undefined}
        />
      );

    case "discoverKeyEntities": {
      const { entities, totalEntitiesFound } =
        toolInvocation.result as DiscoverKeyEntitiesToolOutput;

      return (
        <EntityListResultUI
          entities={entities || []}
          title="Key Entities"
          icon={Database}
          totalCount={totalEntitiesFound}
          args={toolInvocation.args as Record<string, unknown> | undefined}
        />
      );
    }

    case "findEntityRelationships": {
      const { entityName, relationships, totalRelationships } =
        toolInvocation.result as FindEntityRelationshipsToolOutput;

      /*
      const formattedRelationships =
        relationships?.map((rel) => ({
          relationship: rel.relationshipType,
          subject: rel.direction === "outgoing" ? entityName : rel.otherEntity,
          object: rel.direction === "outgoing" ? rel.otherEntity : entityName,
          otherEntity: rel.otherEntity,
          isSubject: rel.direction === "outgoing",
          topicTitle: rel.topicTitle,
          topicId: rel.topicId,
          confidence: rel.confidence,
        })) || [];
      */

      return (
        <RelationshipListResultUI
          relationships={relationships ?? []}
          title={`Relationships for "${entityName}"`}
          entityName={entityName} // Pass entityName for context in RelationshipCard
          icon={LinkIcon}
          totalCount={totalRelationships}
          args={toolInvocation.args as Record<string, unknown> | undefined}
          id={`rel-${entityName}`}
        />
      );
    }

    case "findRelatedTopics": {
      const { topics, totalTopicsFound } =
        toolInvocation.result as FindRelatedTopicsToolOutput;

      return (
        <TopicListResultUI
          topics={topics || []}
          totalCount={totalTopicsFound}
          title="Related Topics"
          icon={BookOpen}
          args={toolInvocation.args as Record<string, unknown> | undefined}
        />
      );
    }

    case "entityLookup": {
      const { entityName, entity, observations, relationships } =
        toolInvocation.result as EntityLookupToolOutput;

      if (!entity) return null;

      // Patch entity to include required fields for EntityListResultUI
      const patchedEntity = {
        ...entity,
        observations: observations?.map((obs) => obs.text) ?? [],
        score:
          "score" in entity && typeof entity.score === "number"
            ? entity.score
            : 1,
        relatedEntities:
          "relatedEntities" in entity && Array.isArray(entity.relatedEntities)
            ? entity.relatedEntities
            : [],
        topMeetings:
          "topMeetings" in entity && Array.isArray(entity.topMeetings)
            ? entity.topMeetings
            : [],
      };

      return (
        <>
          <EntityListResultUI
            entities={[patchedEntity]}
            title={`Entity: ${entityName}`}
            icon={Users}
            args={toolInvocation.args as Record<string, unknown> | undefined}
            id={`entity-${entityName}`}
          />

          {relationships && relationships.length > 0 && (
            <div className="mt-2">
              <RelationshipListResultUI
                relationships={relationships.map((rel) => ({
                  subject:
                    rel.isSubject !== undefined
                      ? rel.isSubject
                        ? entityName
                        : rel.otherEntity
                      : entityName,
                  object:
                    rel.isSubject !== undefined
                      ? rel.isSubject
                        ? rel.otherEntity
                        : entityName
                      : (rel.otherEntity ?? ""),
                  relationship: rel.relationship,
                  observations: [],
                  topicTitle: "",
                  confidence:
                    "confidence" in rel && typeof rel.confidence === "number"
                      ? rel.confidence
                      : 1,
                  meetingId: rel.meetingId ?? "",
                  meetingTitle: rel.meetingTitle ?? undefined,
                  timestamp: rel.timestamp ?? undefined,
                  speakerName: rel.speakerName ?? "",
                  contextBefore: "",
                  contextAfter: "",
                }))}
                title={`Relationships for "${entityName}"`}
                entityName={entityName}
                icon={LinkIcon}
                totalCount={relationships?.length ?? 0}
                id={`lookup-rel-${entityName}`}
              />
            </div>
          )}
        </>
      );
    }

    case "entitySemanticSearch": {
      const { results, totalResults } =
        toolInvocation.result as EntitySemanticSearchToolOutput;

      const totalCount = totalResults
        ? totalResults.entities +
          totalResults.relationships +
          totalResults.observations
        : 0;

      return (
        <CollapsibleSection
          title="Semantic Search Results"
          icon={Eye}
          count={totalCount}
          args={toolInvocation.args as Record<string, unknown> | undefined}
          defaultOpen={true}
        >
          <div className="space-y-3 p-2">
            {results?.entities && results.entities.length > 0 && (
              <EntityListResultUI
                entities={results.entities}
                title={`Found Entities (${results.entities.length})`}
                icon={Database}
                id="sem-entities"
                totalCount={results.entities.length}
              />
            )}

            {results?.relationships && results.relationships.length > 0 && (
              <RelationshipListResultUI
                relationships={results.relationships.map((r) => ({
                  ...r,
                  subject: r.subject,
                  object: r.object,
                }))}
                title={`Found Relationships (${results.relationships.length})`}
                icon={LinkIcon}
                totalCount={results.relationships.length}
                id="sem-rels"
              />
            )}

            {results?.observations && results.observations.length > 0 && (
              <ObservationListResultUI
                observations={results.observations}
                title={`Found Observations (${results.observations.length})`}
                icon={Eye}
                totalCount={results.observations.length}
              />
            )}
          </div>
        </CollapsibleSection>
      );
    }

    case "listEntityNames":
    case "listRelationshipTypes":
    case "listEntityTypes": {
      const result = toolInvocation.result as
        | ListEntityNamesToolOutput
        | ListRelationshipTypesToolOutput
        | ListEntityTypesToolOutput;

      let items: Array<{ name: string }> = [];
      let titleText = ""; // Renamed to avoid conflict with title prop

      if (result?.success) {
        if ("entities" in result && result.entities) {
          items = result.entities.map((entity) => ({ name: entity.name }));
          titleText = "Entity Names";
        } else if ("relationshipTypes" in result && result.relationshipTypes) {
          items = result.relationshipTypes.map((type) => ({ name: type }));
          titleText = "Relationship Types";
        } else if ("entityTypes" in result && result.entityTypes) {
          items = result.entityTypes.map((type) => ({ name: type }));
          titleText = "Entity Types";
        }
      }

      // Use new UI component
      return (
        <SimpleListResultUI
          items={items}
          title={titleText}
          icon={ListIcon}
          args={toolInvocation.args as Record<string, unknown> | undefined}
        />
      );
    }

    case "listReports":
      // Use new UI component
      return (
        <ReportListResultUI
          data={toolInvocation.result as ListReportsToolOutput}
          args={toolInvocation.args as Record<string, unknown> | undefined}
        />
      );

    case "think":
      // Use new UI component
      return (
        <ThinkResultUI
          {...(toolInvocation.result as ThinkToolOutput)}
          args={toolInvocation.args as Record<string, unknown> | undefined}
        />
      );

    default:
      console.warn(
        "Unknown tool name for result rendering:",
        toolInvocation.toolName,
      );

      return (
        <div className="text-xs text-muted-foreground">
          Tool: {toolInvocation.toolName}
          <pre>{JSON.stringify(toolInvocation.result, null, 2)}</pre>
        </div>
      );
  }
}
