import { CalendarIcon } from "@radix-ui/react-icons";
import dayjs from "dayjs";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useProfile } from "~/hooks/use-profile";
import { GoogleCalendarEvent } from "~/lib/google-calendar/schemas";
import { cn, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

import { Link } from "./ui/link";

interface SpecialViewsProps {
  actionItems: RouterOutputs["actionItems"]["getByProfileId"]["actionItems"];
  meetings: RouterOutputs["actionItems"]["getByProfileId"]["meetings"];
  people: RouterOutputs["actionItems"]["getByProfileId"]["people"];
  today: string;
  loading: boolean;
}

// Shared animation configurations
export const ANIMATION_CONFIG = {
  card: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 70,
        damping: 20,
        mass: 1,
        staggerChildren: 0.08,
      },
    },
  },
  list: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 14,
      },
    },
  },
  iconContainer: {
    initial: { scale: 1 },
    hover: {
      scale: 1.15,
      rotate: [0, -8, 8, 0],
      transition: {
        duration: 0.6,
        ease: "easeInOut",
      },
    },
  },
} as const satisfies Record<string, Variants>;

// Base Special View Card Component
interface SpecialViewCardProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  accentColor?: string;
  children: ReactNode;
}

function SpecialViewCard({
  title,
  subtitle,
  icon,
  accentColor = "primary",
  children,
}: SpecialViewCardProps) {
  return (
    <motion.div variants={ANIMATION_CONFIG.card}>
      <Card
        className={cn(
          "group overflow-hidden border-border/40 bg-gradient-to-br from-background/95 to-background/80 shadow-lg backdrop-blur-sm transition-all duration-500",
          `hover:border-${accentColor}/30 hover:shadow-xl hover:shadow-${accentColor}/5`,
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm">
            <motion.div
              variants={ANIMATION_CONFIG.iconContainer}
              initial="initial"
              whileHover="hover"
              className="mr-2"
            >
              {icon}
            </motion.div>
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground/90 transition-colors duration-300 group-hover:text-muted-foreground">
              {subtitle}
            </p>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

// Special View List Component
interface SpecialViewListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  emptyMessage?: string;
  maxItems?: number;
}

function SpecialViewList<T extends { id: string }>({
  items,
  renderItem,
  emptyMessage = "No items to display.",
  maxItems,
}: SpecialViewListProps<T>) {
  return (
    <AnimatePresence>
      {items.length > 0 ? (
        <motion.ul
          variants={ANIMATION_CONFIG.list}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {items.map((item) => (
            <motion.li key={item.id} variants={ANIMATION_CONFIG.item}>
              {renderItem(item)}
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <p className="py-3 text-center text-sm text-muted-foreground/70">
          {emptyMessage}
        </p>
      )}
    </AnimatePresence>
  );
}

// Loading Skeleton Component
function SpecialViewsSkeleton() {
  const skeletonViews = [
    { id: "next-meeting", label: "Next Meeting View" },
    { id: "day-recap", label: "Day Recap View" },
    { id: "morning-prep", label: "Morning Prep View" },
  ] as const;

  const skeletonItems = [
    { id: "item-1", label: "First Item" },
    { id: "item-2", label: "Second Item" },
    { id: "item-3", label: "Third Item" },
  ] as const;

  return (
    <div className="space-y-6">
      {skeletonViews.map((view) => (
        <Card key={view.id} className="overflow-hidden backdrop-blur-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-1 h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {skeletonItems.map((item) => (
                <div
                  key={`${view.id}-${item.id}`}
                  className="flex items-start gap-2"
                >
                  <Skeleton className="mt-1 size-4 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Next Meeting View Component
function NextMeetingView({
  items,
  meeting,
}: {
  items: RouterOutputs["actionItems"]["getByProfileId"]["actionItems"];
  meeting?: { summary?: string; start_date_time?: string } | null;
}) {
  return (
    <SpecialViewCard
      title="For Your Next Meeting"
      subtitle={
        meeting
          ? `${meeting.summary}${meeting.start_date_time ? ` - ${formatDate(meeting.start_date_time)}` : ""}`
          : undefined
      }
      icon={
        <CalendarIcon className="size-4 text-primary transition-colors duration-300 group-hover:text-primary/90" />
      }
    >
      <SpecialViewList
        items={items}
        emptyMessage="No action items for your next meeting."
        renderItem={(item) => (
          <div className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-primary/5">
            <div className="flex h-4 w-2 flex-shrink-0 items-center justify-center rounded-full">
              <div
                className={cn(
                  "size-2 rounded-full transition-all duration-300",
                  item.completed_at
                    ? "bg-primary/90 shadow-sm shadow-primary/20"
                    : "bg-yellow-500/90 shadow-sm shadow-yellow-500/20",
                )}
              />
            </div>
            <div className="flex-1">
              <div
                className={cn(
                  "text-sm font-medium leading-tight tracking-tight transition-colors",
                  item.completed_at
                    ? "text-muted-foreground/80 decoration-primary/40"
                    : "text-foreground/90",
                )}
              >
                {item.text}
              </div>
              {item.assignees && item.assignees.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/80">
                  <span>Assigned to:</span>
                  {item.assignees
                    .map((assignee) => assignee.assignee.name)
                    .join(", ")}
                </div>
              )}
            </div>
          </div>
        )}
      />
    </SpecialViewCard>
  );
}

// Day Recap View Component
function DayRecapView({
  items,
}: {
  items: RouterOutputs["actionItems"]["getByProfileId"]["actionItems"];
}) {
  return (
    <SpecialViewCard
      title="Day Recap"
      subtitle="Completed today"
      icon={
        <CheckCircle2 className="size-4 text-emerald-500 transition-colors duration-300 group-hover:text-emerald-500/90" />
      }
      accentColor="emerald-500"
    >
      <SpecialViewList
        items={items}
        emptyMessage="No items completed today."
        renderItem={(item) => (
          <div className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-emerald-500/5">
            <motion.div
              variants={ANIMATION_CONFIG.item}
              animate="checked"
              className="mt-0.5 flex size-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/90 shadow-sm shadow-emerald-500/20"
            >
              <motion.svg
                initial={false}
                animate={{
                  scale: [0, 1.2, 1],
                  opacity: 1,
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut",
                }}
                className="size-2.5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Completed action item checkmark"
                role="img"
              >
                <polyline points="20 6 9 17 4 12" />
              </motion.svg>
            </motion.div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground/80">
                {item.text}
              </div>
              {item.meeting && (
                <div className="mt-1 text-xs text-muted-foreground/70">
                  From: {item.meeting.name}
                </div>
              )}
            </div>
          </div>
        )}
      />
    </SpecialViewCard>
  );
}

// Morning Prep View Component
function MorningPrepView({
  items,
}: {
  items: RouterOutputs["actionItems"]["getByProfileId"]["actionItems"];
}) {
  return (
    <SpecialViewCard
      title="Morning Prep"
      subtitle="Due today"
      icon={
        <Clock className="size-4 text-yellow-500 transition-colors duration-300 group-hover:text-yellow-500/90" />
      }
      accentColor="yellow-500"
    >
      <SpecialViewList
        items={items}
        emptyMessage="No items due today."
        renderItem={(item) => (
          <div className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-yellow-500/5">
            <div className="mt-0.5 size-2 rounded-full bg-yellow-500/90 shadow-sm shadow-yellow-500/20" />
            <div className="flex-1">
              <div className="text-sm font-medium leading-tight tracking-tight text-foreground/90">
                {item.text}
              </div>
              {item.assignees && item.assignees.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/80">
                  <span>Assigned to:</span>
                  {item.assignees
                    .map((assignee) => assignee.assignee.name)
                    .join(", ")}
                </div>
              )}
              <Badge
                variant="outline"
                className="mt-2 border-yellow-500/30 text-xs text-yellow-500/90 transition-colors hover:bg-yellow-500/10"
              >
                Due today
              </Badge>
            </div>
          </div>
        )}
      />
    </SpecialViewCard>
  );
}

// Main Special Views Component
export function SpecialViews({
  actionItems,
  meetings,
  people,
  today,
  loading,
}: SpecialViewsProps) {
  const { profile } = useProfile();

  // Get next meeting from calendar API
  const { data: calendarEvents } = api.calendar.getCalendarEvents.useQuery(
    {
      profileId: profile?.id ?? "",
    },
    {
      enabled: !!profile?.id,
    },
  );

  const nextMeeting = calendarEvents?.[0];

  // Get participants for next meeting from raw calendar event data
  const nextMeetingParticipants = (() => {
    try {
      if (!nextMeeting?.raw) return [];
      const rawEvent = GoogleCalendarEvent.parse(nextMeeting.raw);
      return rawEvent.attendees?.map((a) => a.email) ?? [];
    } catch (e) {
      console.error("Error parsing calendar event raw data:", e);
      return [];
    }
  })();

  // Filter action items for next meeting based on assignee overlap with meeting participants
  const nextMeetingItems = actionItems.filter((item) =>
    item.assignees?.some((assignee) =>
      nextMeetingParticipants.some(
        (participant) =>
          assignee.assignee.name.slice(0, 3).toLowerCase() ===
          participant?.slice(0, 3).toLowerCase(),
      ),
    ),
  );

  // Get items completed today
  const todayCompletedItems = actionItems.filter(
    (item) =>
      item.completed_at && dayjs(item.completed_at).isSame(dayjs(today), "day"),
  );

  // Get items due today that aren't completed
  const todayDueItems = actionItems.filter(
    (item) =>
      !item.completed_at &&
      item.due_date &&
      dayjs(item.due_date).isSame(dayjs(today), "day"),
  );

  if (loading) {
    return <SpecialViewsSkeleton />;
  }

  return (
    <motion.div
      variants={ANIMATION_CONFIG.list}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <MorningPrepView items={todayDueItems} />
      <NextMeetingView items={nextMeetingItems} meeting={nextMeeting} />
      <DayRecapView items={todayCompletedItems} />
    </motion.div>
  );
}
