"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import _ from "lodash";
import {
  Bookmark,
  Calendar,
  CheckSquare,
  ChevronRight,
  FileText,
  Goal,
  HelpCircle,
  type LucideIcon,
  MessageSquare,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { SourceTooltip } from "~/components/sessions/source-tooltip";
import { Badge } from "~/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// Type definitions
type SessionAnnotation = Tables<"session_annotations"> & {
  sources: AnnotationSource[];
};

type AnnotationSource = Tables<"session_annotation_sources">;
type SourceType = AnnotationSource["source_type"];
type SourceIconMap = Record<SourceType, LucideIcon>;
type BadgeVariant = "primary" | "success" | null;
type ExpandedState = Record<string, boolean>;

export interface SessionAnnotationProps {
  annotations: SessionAnnotation[];
  className?: string;
}

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
      mass: 0.8,
    },
  },
};

const badgeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
      delay: 0.1,
    },
  },
};

const sourceVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
      delay: 0.15 + index * 0.05,
    },
  }),
};

// Reaction button animation variants
const reactionVariants: Variants = {
  hidden: { opacity: 0, scale: 0, y: 0 },
  hover: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
    },
  },
  tap: {
    scale: 0.9,
    transition: {
      duration: 0.1,
    },
  },
};

// Component for the header section
function SessionHeader(): JSX.Element {
  return (
    <div className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase leading-none text-muted-foreground">
      <Sparkles className="h-4 w-4 text-primary" />
      Suggested Topics
    </div>
  );
}

// Component for empty state
function EmptyState(): JSX.Element {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-primary/20 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full">
          <FileText className="h-5 w-5 text-primary opacity-70" />
        </div>
        <p className="max-w-[15rem] text-sm text-muted-foreground">
          Come back 48 hours before your meeting for suggested topics
        </p>
      </div>
    </div>
  );
}

// Component for source badge with pre-loaded details
interface SourceBadgeWithDetailsProps {
  source: AnnotationSource;
  index: number;
  details?: RouterOutputs["sessionAnnotations"]["getSourceDetails"] | null;
  renderSourceIcon: (sourceType: string) => JSX.Element;
}

function SourceBadgeWithDetails({
  source,
  index,
  details,
  renderSourceIcon,
}: SourceBadgeWithDetailsProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fallback to fetching individual details if batch query didn't return this one
  const { data: individualDetails } =
    api.sessionAnnotations.getSourceDetails.useQuery(
      {
        sourceId: source.source_id,
        sourceType: source.source_type,
      },
      {
        staleTime: Number.POSITIVE_INFINITY,
        enabled: !details,
      },
    );

  const displayDetails = details || individualDetails;

  return (
    <>
      <motion.div custom={index} variants={sourceVariants}>
        <SourceTooltip
          sourceId={source.source_id}
          sourceType={source.source_type}
          onViewDetails={() => setIsModalOpen(true)}
        />
      </motion.div>

      {/* Source Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="flex h-6 w-6 items-center justify-center rounded-full">
                {displayDetails && (
                  <div className="text-primary">
                    {renderSourceIcon(source.source_type)}
                  </div>
                )}
              </div>
              <span>Source Details</span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {displayDetails ? (
              <div className="space-y-4">
                <div className="rounded-md border border-primary/10 p-3.5">
                  <div className="mb-2 text-sm font-medium text-primary/80">
                    Source Info
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Type:
                      </span>
                      <Badge
                        variant="outline"
                        className="h-5 font-medium capitalize"
                      >
                        {source.source_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        ID:
                      </span>
                      <span className="rounded px-1.5 py-0.5 font-mono text-sm">
                        {source.source_id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  <p className="text-sm text-muted-foreground">
                    Loading source details...
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Component for source group
interface SourceGroupProps {
  sourceType: string;
  sources: AnnotationSource[];
  groupIndex: number;
  renderSourceIcon: (sourceType: string) => JSX.Element;
  formatSourceType: (sourceType: string) => string;
}

function SourceGroup({
  sourceType,
  sources,
  groupIndex,
  renderSourceIcon,
  formatSourceType,
}: SourceGroupProps): JSX.Element {
  const sourcesList = sources.map((source) => ({
    sourceId: source.source_id,
    sourceType: source.source_type,
  }));

  // Individual queries for each source instead of batch query
  return (
    <motion.div
      key={sourceType}
      className="rounded-md border border-primary/5 p-2.5 shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.2 + groupIndex * 0.05,
      }}
    >
      <div className="mb-2 flex items-center gap-1.5 px-1 text-sm font-medium text-foreground">
        <div className="flex h-5 w-5 items-center justify-center rounded-full">
          {renderSourceIcon(sourceType)}
        </div>
        <div className="capitalize leading-none">
          {formatSourceType(sourceType)}
        </div>
        <Badge
          variant="outline"
          className="ml-auto h-4 px-1.5 text-[10px] text-muted-foreground"
        >
          {sources.length}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5 px-1 py-1">
        {sources.map((source, index) => (
          <SourceBadgeWithDetails
            key={source.id}
            source={source}
            index={index}
            details={null}
            renderSourceIcon={renderSourceIcon}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Component for annotation content
interface AnnotationContentProps {
  annotation: SessionAnnotation;
  groupSourcesByType: (
    sources: AnnotationSource[],
  ) => Record<string, AnnotationSource[]>;
  renderSourceIcon: (sourceType: string) => JSX.Element;
  formatSourceType: (sourceType: string) => string;
}

function AnnotationContent({
  annotation,
  groupSourcesByType,
  renderSourceIcon,
  formatSourceType,
}: AnnotationContentProps): JSX.Element {
  const hasDescription = Boolean(annotation.description);
  const hasSources = annotation.sources && annotation.sources.length > 0;
  const groupedSources = groupSourcesByType(annotation.sources || []);

  return (
    <motion.div
      className="px-3 pb-4"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{
        hidden: { opacity: 0, height: 0 },
        visible: { opacity: 1, height: "auto" },
      }}
      transition={{ duration: 0.3 }}
    >
      {hasDescription && (
        <motion.div
          className="mb-4 rounded-lg p-3.5 text-sm leading-relaxed shadow-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {annotation.description}
        </motion.div>
      )}

      {hasSources && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="mt-1 space-y-2.5">
            {Object.entries(groupedSources).map(
              ([sourceType, sources], groupIndex) => (
                <SourceGroup
                  key={sourceType}
                  sourceType={sourceType}
                  sources={sources}
                  groupIndex={groupIndex}
                  renderSourceIcon={renderSourceIcon}
                  formatSourceType={formatSourceType}
                />
              ),
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Component for annotation item
interface AnnotationItemProps {
  annotation: SessionAnnotation;
  isExpanded: boolean;
  toggleExpanded: (id: string) => void;
  getBadgeVariant: (type: string | null) => BadgeVariant;
  groupSourcesByType: (
    sources: AnnotationSource[],
  ) => Record<string, AnnotationSource[]>;
  renderSourceIcon: (sourceType: string) => JSX.Element;
  formatSourceType: (sourceType: string) => string;
  isDisliked: boolean;
}

function AnnotationItem({
  annotation,
  isExpanded,
  toggleExpanded,
  getBadgeVariant,
  groupSourcesByType,
  renderSourceIcon,
  formatSourceType,
  isDisliked,
}: AnnotationItemProps): JSX.Element {
  const badgeVariant = getBadgeVariant(annotation.type);
  const utils = api.useUtils();
  const { data: user } = api.auth.getUser.useQuery();
  const [isHovering, setIsHovering] = useState(false);

  // Get reactions for this annotation
  const { data: reactions } = api.sessionAnnotations.getReactions.useQuery({
    annotationId: annotation.id,
  });

  // Add reaction mutation with optimistic updates
  const { mutate: addReaction } =
    api.sessionAnnotations.addReaction.useMutation({
      onMutate: async ({ type }) => {
        // Cancel outgoing refetches
        await utils.sessionAnnotations.getReactions.cancel({
          annotationId: annotation.id,
        });

        // Get the current reactions
        const previousReactions = utils.sessionAnnotations.getReactions.getData(
          {
            annotationId: annotation.id,
          },
        );

        // Check if we're toggling off an existing reaction
        const existingUserReaction = previousReactions?.find(
          (r) => r.user_id === user?.id,
        );
        const isToggling = existingUserReaction?.reaction_type === type;

        // Optimistically update the UI - Handle typing more safely
        utils.sessionAnnotations.getReactions.setData(
          { annotationId: annotation.id },
          (old) => {
            if (!old) return [];

            // When toggling off, just remove the reaction
            if (isToggling) {
              return old.filter((r) => r.user_id !== user?.id);
            }

            // Remove any existing reaction from this user
            const filtered = old.filter((r) => r.user_id !== user?.id);

            if (!user) return filtered;

            // Create a new reaction that matches the shape expected by the API
            return [
              ...filtered,
              {
                id: "temp-id",
                session_annotation_id: annotation.id,
                user_id: user.id,
                reaction_type: type,
                created_at: new Date().toISOString(),
                user: {
                  id: user.id,
                  email: user.email,
                  nickname: user.nickname,
                  coach_id: null,
                  company: null,
                  created_at: null,
                  did_complete_onboarding: user.did_complete_onboarding,
                  did_complete_post_ten_meeting_onboarding:
                    user.did_complete_post_ten_meeting_onboarding,
                  updated_at: new Date().toISOString(),
                },
              } as Tables<"session_annotation_reactions"> & {
                user: Tables<"profiles">;
              },
            ];
          },
        );

        return { previousReactions };
      },
      onError: (_err, _newReaction, context) => {
        // Restore the previous state if there was an error
        utils.sessionAnnotations.getReactions.setData(
          { annotationId: annotation.id },
          context?.previousReactions,
        );
        toast.error("Failed to add reaction. Please try again.");
      },
      // Invalidate both individual reaction query and the collection query
      onSuccess: () => {
        void utils.sessionAnnotations.getAllReactions.invalidate();
      },
    });

  const handleReaction = (type: "thumbs_up" | "thumbs_down") => {
    if (!user) {
      toast.error("Please sign in to react to annotations.");
      return;
    }
    addReaction({ annotationId: annotation.id, type });
  };

  // Calculate reaction counts
  const thumbsUpCount =
    reactions?.filter((r) => r.reaction_type === "thumbs_up").length ?? 0;
  const thumbsDownCount =
    reactions?.filter((r) => r.reaction_type === "thumbs_down").length ?? 0;
  const userReaction = reactions?.find(
    (r) => r.user_id === user?.id,
  )?.reaction_type;

  // Check if we should always show reaction buttons
  const hasReactions = thumbsUpCount > 0 || thumbsDownCount > 0;

  // Background colors for the entire card based on badge variant
  const cardBackground =
    badgeVariant === "primary"
      ? "hover:bg-primary/10"
      : badgeVariant === "success"
        ? "hover:bg-emerald-900/10" // Darker emerald background
        : "hover:bg-primary/10";

  const borderColor =
    badgeVariant === "primary"
      ? "border-primary/20"
      : badgeVariant === "success"
        ? "border-emerald-900/20" // Darker emerald border
        : "border-primary/20";

  const circleColor =
    badgeVariant === "primary"
      ? "text-primary"
      : badgeVariant === "success"
        ? "text-emerald-600" // Darker emerald badge
        : "text-primary";

  return (
    <Collapsible
      key={annotation.id}
      open={isExpanded}
      onOpenChange={() => toggleExpanded(annotation.id)}
    >
      <motion.div
        variants={rowVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className={cn(
          "group relative rounded-xl border shadow-sm transition-all duration-300",
          isExpanded
            ? `${borderColor} shadow-md ring-1 ring-primary/10`
            : `${borderColor} hover:shadow-sm`,
          cardBackground,
          // Apply fading effect for disliked annotations
          isDisliked && "opacity-60 hover:opacity-90",
        )}
        style={{
          position: "relative",
        }}
        onHoverStart={() => setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
      >
        {/* Expanded background pulse */}
        {isExpanded && (
          <motion.div
            className={cn(
              "absolute inset-0",
              badgeVariant === "primary"
                ? "bg-primary/3"
                : badgeVariant === "success"
                  ? "bg-emerald-900/3" // Darker emerald pulse
                  : "bg-primary/3",
            )}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.03, 0.06, 0.03],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Reaction buttons that appear on hover - positioned outside the card */}
        <motion.div
          className="absolute -top-2 right-2 z-10 flex items-center gap-1"
          variants={{
            hidden: { opacity: hasReactions ? 1 : 0, y: hasReactions ? 0 : 10 },
            hover: { opacity: 1, y: 0 },
          }}
          initial={hasReactions ? "visible" : "hidden"}
          animate={isHovering || hasReactions ? "hover" : "hidden"}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            variants={reactionVariants}
            whileTap="tap"
            className={cn(
              "flex h-8 items-center justify-center gap-1 rounded-full border bg-background px-2.5 py-1.5 shadow-md transition-colors",
              userReaction === "thumbs_up"
                ? "border-primary/30 text-primary"
                : "border-muted text-muted-foreground hover:text-primary",
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleReaction("thumbs_up");
            }}
          >
            <ThumbsUp className="h-4 w-4" />
            {thumbsUpCount > 0 && (
              <span className="text-xs font-medium">{thumbsUpCount}</span>
            )}
          </motion.button>
          <motion.button
            variants={reactionVariants}
            whileTap="tap"
            className={cn(
              "flex h-8 items-center justify-center gap-1 rounded-full border bg-background px-2.5 py-1.5 shadow-md transition-colors",
              userReaction === "thumbs_down"
                ? "border-destructive/30 text-destructive"
                : "border-muted text-muted-foreground hover:text-destructive",
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleReaction("thumbs_down");
            }}
          >
            <ThumbsDown className="h-4 w-4" />
            {thumbsDownCount > 0 && (
              <span className="text-xs font-medium">{thumbsDownCount}</span>
            )}
          </motion.button>
        </motion.div>

        <CollapsibleTrigger className="w-full text-left">
          <div className="relative flex flex-col px-3.5 py-3">
            {/* Title row with badge moved to the right */}
            <div className="flex items-center justify-between gap-2">
              <motion.div className="flex-1 text-left text-sm font-medium text-foreground">
                {annotation.title_summarized || annotation.title || "Untitled"}
              </motion.div>

              <div className="flex items-center gap-2">
                {/* Type indicator as a subtle badge instead of dot+text */}
                {annotation.type && (
                  <motion.div
                    variants={badgeVariants}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      circleColor,
                    )}
                  >
                    {_.startCase(annotation.type)}
                  </motion.div>
                )}

                <motion.div
                  className="flex-shrink-0 text-primary/60"
                  animate={{
                    rotate: isExpanded ? 90 : 0,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "anticipate",
                  }}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4",
                      annotation.type === "new"
                        ? "text-emerald-600"
                        : "text-primary",
                    )}
                  />
                </motion.div>
              </div>
            </div>

            {/* Title preview - 2 lines */}
            {annotation.title && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {annotation.title}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[20rem]">
                  <p>{annotation.title}</p>
                  <p className="mt-2 text-xs font-medium italic">
                    Click for more details
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AnnotationContent
            annotation={annotation}
            groupSourcesByType={groupSourcesByType}
            renderSourceIcon={renderSourceIcon}
            formatSourceType={formatSourceType}
          />
        </CollapsibleContent>
      </motion.div>
    </Collapsible>
  );
}

// Main component
export default function SessionAnnotation({
  annotations,
  className,
}: SessionAnnotationProps): JSX.Element {
  const [expandedState, setExpandedState] = useState<ExpandedState>({});

  // Source icon mapping
  const sourceIcons: SourceIconMap = useMemo(
    () => ({
      goal: Goal,
      moment: Bookmark,
      meeting: Calendar,
      topic: MessageSquare,
      topic_discussed: MessageSquare,
      entity: Bookmark,
      relationship: Bookmark,
      entity_observation: MessageSquare,
      relationship_observation: MessageSquare,
      topic_observation: MessageSquare,
      action_item: CheckSquare,
    }),
    [],
  );

  // Function to determine badge color based on type
  const getBadgeVariant = useCallback((type: string | null): BadgeVariant => {
    switch (type) {
      case "past_session":
        return "primary";
      case "new":
        return "success";
      default:
        return null;
    }
  }, []);

  // Group sources by type
  const groupSourcesByType = useCallback(
    (sources: AnnotationSource[]): Record<string, AnnotationSource[]> => {
      return sources.reduce<Record<string, AnnotationSource[]>>(
        (grouped, source) => {
          const type = source.source_type;
          if (!grouped[type]) {
            grouped[type] = [];
          }
          grouped[type].push(source);
          return grouped;
        },
        {},
      );
    },
    [],
  );

  // Function to get icon for source type
  const renderSourceIcon = useCallback(
    (sourceType: string): JSX.Element => {
      const IconComponent = sourceIcons[sourceType] || HelpCircle;
      return (
        <IconComponent
          className="h-3 w-3"
          style={{ transformOrigin: "center" }}
        />
      );
    },
    [sourceIcons],
  );

  // Function to format source type for display
  const formatSourceType = useCallback((sourceType: string): string => {
    return _.startCase(sourceType.replace(/_/g, " "));
  }, []);

  // Toggle expanded state for an annotation
  const toggleExpanded = useCallback((id: string): void => {
    setExpandedState((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  }, []);

  // Fetch all annotations reactions at once for sorting
  const annotationIds = useMemo(
    () => annotations.map((a) => a.id),
    [annotations],
  );
  const { data: allReactions } =
    api.sessionAnnotations.getAllReactions.useQuery(
      { annotationIds },
      { enabled: annotationIds.length > 0 },
    );

  // Calculate net scores for sorting
  const netScores = useMemo(() => {
    if (!allReactions) return {};

    const scores: Record<string, number> = {};

    // Initialize all annotations with 0 score
    for (const id of annotationIds) {
      scores[id] = 0;
    }

    // Calculate net scores (thumbs up - thumbs down)
    for (const reaction of allReactions) {
      const annotationId = reaction.session_annotation_id;
      if (reaction.reaction_type === "thumbs_up") {
        scores[annotationId] = (scores[annotationId] || 0) + 1;
      } else if (reaction.reaction_type === "thumbs_down") {
        scores[annotationId] = (scores[annotationId] || 0) - 1;
      }
    }

    return scores;
  }, [allReactions, annotationIds]);

  // Sort annotations by net score
  const sortedAnnotations = useMemo(() => {
    if (!netScores || Object.keys(netScores).length === 0)
      return [...annotations];

    return [...annotations].sort((a, b) => {
      const scoreA = netScores[a.id] || 0;
      const scoreB = netScores[b.id] || 0;
      return scoreB - scoreA; // Sort by descending score (highest first)
    });
  }, [annotations, netScores]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2 px-4 pb-4 pt-2", className)}
    >
      <SessionHeader />

      <div className="relative grid grid-cols-1 gap-4 rounded-lg">
        <AnimatePresence>
          {sortedAnnotations.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="col-span-1 grid grid-cols-1 gap-3"
            >
              {sortedAnnotations.map((annotation) => {
                const netScore = netScores[annotation.id] || 0;
                const isDisliked = netScore < 0;

                return (
                  <AnnotationItem
                    key={annotation.id}
                    annotation={annotation}
                    isExpanded={Boolean(expandedState[annotation.id])}
                    toggleExpanded={toggleExpanded}
                    getBadgeVariant={getBadgeVariant}
                    groupSourcesByType={groupSourcesByType}
                    renderSourceIcon={renderSourceIcon}
                    formatSourceType={formatSourceType}
                    isDisliked={isDisliked}
                  />
                );
              })}
            </motion.div>
          ) : (
            <EmptyState />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
