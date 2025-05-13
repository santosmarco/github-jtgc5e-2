"use client";

import { motion } from "framer-motion";
import {
  BookOpenIcon,
  FileTextIcon,
  TagIcon as KeyEntityIcon,
  TrendingUpIcon,
} from "lucide-react"; // Using BookOpen for topics

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { Badge } from "~/components/ui/badge";
import type { FindRelatedTopicsToolOutput } from "~/lib/processing/ai-search-tools";

export type TopicItem = NonNullable<
  FindRelatedTopicsToolOutput["topics"]
>[number];

export type TopicCardProps = {
  topic: TopicItem;
  index: number;
};

export function TopicCard({ topic, index }: TopicCardProps) {
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

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="space-y-1.5 rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-4 w-4 flex-shrink-0 text-indigo-500" />
          <h5 className="text-sm font-semibold text-foreground">
            {topic.title}
          </h5>
        </div>

        {topic.score !== undefined && (
          <Badge
            variant="outline"
            className="whitespace-nowrap border-dashed text-xs"
          >
            Relevance: {(topic.score * 100).toFixed(0)}%
          </Badge>
        )}
      </div>

      {topic.meetingTitle && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileTextIcon className="h-3 w-3 flex-shrink-0" />
          <span>{topic.meetingTitle}</span>
        </div>
      )}

      {topic.keyEntities && topic.keyEntities.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <KeyEntityIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          {topic.keyEntities.slice(0, 3).map((entity, idx) => (
            <Badge key={idx} variant="secondary" className="font-normal">
              {entity}
            </Badge>
          ))}
          {topic.keyEntities.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal">
              + {topic.keyEntities.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
}

export type TopicListResultUIProps = {
  topics: TopicItem[];
  title?: string; // Optional, can default in the component
  icon?: React.ElementType;
  totalCount?: number;
  args?: Record<string, unknown>;
};

export function TopicListResultUI({
  topics,
  title = "Related Topics",
  icon: SectionIcon = TrendingUpIcon, // Defaulting to TrendingUpIcon for related topics
  totalCount,
  args,
}: TopicListResultUIProps) {
  if (!topics || topics.length === 0) {
    return (
      <CollapsibleSection
        title={title}
        icon={SectionIcon}
        count={0}
        args={args}
        defaultOpen={true}
      >
        <p className="p-3 text-sm text-muted-foreground">No topics found.</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={title}
      icon={SectionIcon}
      count={totalCount ?? topics.length}
      args={args}
      defaultOpen={true}
    >
      <div className="space-y-2 p-2">
        {topics.map((topic, index) => (
          <TopicCard key={topic.topicId || index} topic={topic} index={index} />
        ))}
      </div>
    </CollapsibleSection>
  );
}
