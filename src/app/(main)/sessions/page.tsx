"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import _ from "lodash";
import { Calendar, CalendarIcon, ChevronDown, Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SessionList } from "~/components/sessions/session-list";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { useIsMobile } from "~/hooks/use-mobile";
import { useProfile } from "~/hooks/use-profile";
import { useSessionNavigation } from "~/hooks/use-session-navigation";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function SessionsPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const isMobile = useIsMobile();
  const [isNavOpen, setIsNavOpen] = useState(!isMobile);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    {},
  );

  // Fetch sessions from API
  const { data: sessionsData, isLoading } =
    api.sessions.getAllSessionsForUser.useQuery(
      {
        profileId: profile?.id ?? "",
      },
      {
        enabled: !!profile?.id,
      },
    );

  // Filter sessions based on search and filters
  const filteredSessions = (sessionsData ?? []).filter((session) => {
    // Apply search filter
    if (
      searchQuery &&
      !session.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !session.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    /*
    // Apply time filter
    if (selectedTimeFilter !== "all" && session.status !== selectedTimeFilter) {
      return false;
    }

    // Apply type filter
    if (selectedTypeFilter !== "all" && session.type !== selectedTypeFilter) {
      return false;
    }
    */

    return true;
  });

  // Sort sessions by date in descending order using lodash
  const sortedSessions = _.orderBy(
    filteredSessions,
    [(session) => (session.date ? new Date(session.date).getTime() : 0)],
    ["desc"],
  );

  // Find the next upcoming session
  const nextSession = useMemo(() => {
    if (_.isEmpty(sortedSessions)) return null;
    const now = new Date();

    return _.chain(sortedSessions)
      .filter((session) => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate > now;
      })
      .sortBy((session) => session.date)
      .first()
      .value();
  }, [sortedSessions]);

  // Group sessions by month
  const groupedSessions = useMemo(() => {
    if (_.isEmpty(sortedSessions)) return [];

    // First, ensure we filter out sessions without dates
    const sessionsWithDates = sortedSessions.filter((session) =>
      Boolean(session.date),
    );

    // Use a more reliable groupBy approach with consistent date formatting
    const sessionsByMonth: Record<string, typeof sortedSessions> = {};

    // Group sessions by YYYY-MM format
    for (const session of sessionsWithDates) {
      const monthKey = dayjs(session.date).format("YYYY-MM");
      if (!sessionsByMonth[monthKey]) {
        sessionsByMonth[monthKey] = [];
      }
      sessionsByMonth[monthKey].push(session);
    }

    // Convert the record to an array of group objects
    const groups = Object.entries(sessionsByMonth).map(
      ([monthKey, monthSessions]) => {
        // Format month for display: "September 2023"
        const displayMonth = dayjs(monthSessions[0]?.date).format("MMMM YYYY");
        return {
          month: displayMonth,
          monthKey,
          sessions: monthSessions,
        };
      },
    );

    // Sort by month (newest first)
    const sortedGroups = _.sortBy(groups, (group) => group.monthKey).reverse();

    // Initialize expansion state for new months - all expanded by default
    for (const group of sortedGroups) {
      if (expandedMonths[group.monthKey] === undefined) {
        setExpandedMonths((prev) => ({
          ...prev,
          [group.monthKey]: true, // Always set to true to start with all months expanded
        }));
      }
    }

    return sortedGroups;
  }, [sortedSessions, expandedMonths]);

  // Toggle month expansion
  const toggleMonthExpansion = (monthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  // Use the session navigation hook with options
  const { activeSessionId, setSessionRef, handleSessionClick } =
    useSessionNavigation(sortedSessions, {
      threshold: 0.6, // Increased threshold for better detection
      scrollBehavior: "smooth",
      highlightOnScroll: true,
    });

  // Toggle mobile navigator
  const toggleNavigator = () => {
    setIsNavOpen(!isNavOpen);
  };

  // Effect to close navigator when resizing from mobile to desktop
  useEffect(() => {
    setIsNavOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div className="flex items-center">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
              onClick={toggleNavigator}
              type="button"
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
        </div>
      </motion.div>

      {/* <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
      >
        <div className="relative sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            className="w-full pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex space-x-2">
          <Select
            value={selectedTimeFilter}
            onValueChange={setSelectedTimeFilter}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedTypeFilter}
            onValueChange={setSelectedTypeFilter}
          >
            <SelectTrigger className="w-[140px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="coaching">Coaching</SelectItem>
              <SelectItem value="group">Group Session</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div> */}

      <div className="mt-8 flex">
        {/* Session Navigator Sidebar */}
        <motion.div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 transform bg-background/90 shadow-md backdrop-blur-sm transition-all duration-300 ease-in-out",
            isMobile
              ? isNavOpen
                ? "translate-x-0"
                : "-translate-x-full"
              : "sticky top-20 h-[calc(100vh-5rem)] translate-x-0 shadow-none",
          )}
          initial={isMobile ? { x: "-100%" } : { x: 0, opacity: 0 }}
          animate={
            isMobile ? { x: isNavOpen ? 0 : "-100%" } : { x: 0, opacity: 1 }
          }
          transition={{ duration: 0.3 }}
        >
          <div className="flex h-full flex-col">
            {isMobile && (
              <div className="mb-4 flex items-center justify-between pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleNavigator}
                  type="button"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3 px-2 py-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      className="overflow-hidden rounded-md border border-border/30 bg-background"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: i * 0.08,
                        ease: "easeOut",
                      }}
                    >
                      <div className="px-3 py-2.5">
                        <div className="flex flex-col gap-2">
                          <motion.div
                            className="h-4 w-3/4 rounded-sm bg-muted"
                            animate={{
                              opacity: [0.5, 0.8, 0.5],
                              scale: [1, 1.01, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut",
                            }}
                          />
                          <div className="flex items-center gap-1.5">
                            <motion.div
                              className="h-3 w-3 rounded-full bg-muted/80"
                              animate={{ opacity: [0.4, 0.7, 0.4] }}
                              transition={{
                                duration: 1.5,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                                delay: i * 0.1,
                              }}
                            />
                            <motion.div
                              className="h-2.5 w-16 rounded-sm bg-muted/80"
                              animate={{ opacity: [0.4, 0.7, 0.4] }}
                              transition={{
                                duration: 1.5,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                                delay: i * 0.1 + 0.1,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : sortedSessions.length > 0 ? (
                <ul className="space-y-1.5">
                  {sortedSessions.map((session) => {
                    const isActive = activeSessionId === session.id;
                    const sessionDate = session.date
                      ? new Date(session.date)
                      : null;
                    const formattedDate = sessionDate
                      ? new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year:
                            sessionDate.getFullYear() !==
                            new Date().getFullYear()
                              ? "numeric"
                              : undefined,
                        }).format(sessionDate)
                      : "No date";

                    return (
                      <li key={session.id}>
                        <button
                          onClick={() => {
                            handleSessionClick(session.id);
                            if (isMobile) setIsNavOpen(false);
                          }}
                          className={cn(
                            "group relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-all duration-200",
                            isActive
                              ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                              : "border-transparent bg-transparent hover:bg-muted/50",
                          )}
                          type="button"
                        >
                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
                          )}

                          <div className="space-y-1.5">
                            <div
                              className={cn(
                                "line-clamp-1 font-medium transition-colors",
                                isActive
                                  ? "text-primary"
                                  : "text-foreground group-hover:text-foreground/80",
                              )}
                            >
                              {session.title || "Untitled Session"}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 opacity-70" />
                              {formattedDate}
                            </div>
                          </div>

                          {/* Active indicator pulse */}
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-md bg-primary/5"
                              initial={{ opacity: 0 }}
                              animate={{
                                opacity: [0.05, 0.1, 0.05],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                              }}
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No sessions found
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sessions List Content */}
        <motion.div
          className={cn("flex-1", isMobile ? "w-full" : "ml-6")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2].map((groupIndex) => (
                  <motion.div
                    key={groupIndex}
                    className="overflow-hidden rounded-lg border border-border/40"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: groupIndex * 0.15,
                      ease: "easeOut",
                    }}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <motion.div
                        className="flex items-center gap-2"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                          delay: groupIndex * 0.2,
                        }}
                      >
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="h-4 w-32 rounded-md bg-muted/80" />
                      </motion.div>
                      <div className="h-4 w-4 rounded-full bg-muted/80" />
                    </div>

                    <div className="space-y-4 p-4">
                      {[1, 2, 3].map((sessionIndex) => (
                        <motion.div
                          key={`${groupIndex}-${sessionIndex}`}
                          className="overflow-hidden rounded-lg border border-border/30 bg-card/50"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: groupIndex * 0.1 + sessionIndex * 0.08,
                            ease: "easeOut",
                          }}
                        >
                          <div className="p-4">
                            <div className="mb-3 flex justify-between">
                              <motion.div
                                className="h-5 w-2/5 rounded-md bg-muted"
                                animate={{
                                  opacity: [0.6, 0.9, 0.6],
                                  scale: [1, 1.005, 1],
                                }}
                                transition={{
                                  duration: 2.5,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "easeInOut",
                                  delay: sessionIndex * 0.1,
                                }}
                              />
                              <motion.div
                                className="h-4 w-20 rounded-md bg-muted/70"
                                animate={{ opacity: [0.5, 0.8, 0.5] }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "easeInOut",
                                  delay: sessionIndex * 0.15,
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <motion.div
                                className="h-3 w-full rounded-sm bg-muted/60"
                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "easeInOut",
                                  delay: sessionIndex * 0.05,
                                }}
                              />
                              <motion.div
                                className="h-3 w-4/5 rounded-sm bg-muted/60"
                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "easeInOut",
                                  delay: sessionIndex * 0.05 + 0.1,
                                }}
                              />
                              <motion.div
                                className="h-3 w-2/3 rounded-sm bg-muted/60"
                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "easeInOut",
                                  delay: sessionIndex * 0.05 + 0.2,
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : groupedSessions.length > 0 ? (
              <div className="space-y-2">
                {groupedSessions.map((group) => {
                  const isExpanded = expandedMonths[group.monthKey] ?? true;
                  const hasNextSession = group.sessions.some(
                    (session) => session.id === nextSession?.id,
                  );

                  return (
                    <Collapsible
                      key={group.monthKey}
                      open={isExpanded}
                      onOpenChange={() => toggleMonthExpansion(group.monthKey)}
                    >
                      <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left text-muted-foreground hover:text-foreground">
                        <div className="flex items-center">
                          <h3 className="flex items-center gap-x-2 text-sm font-medium leading-none">
                            <CalendarIcon className="-mt-0.5 mr-2 h-4 w-4" />
                            {group.month}
                            {hasNextSession ? (
                              <span className="ml-2 text-xs leading-none text-primary">
                                (Next Session)
                              </span>
                            ) : (
                              <span className="ml-2 text-xs leading-none text-muted-foreground">
                                ({group.sessions.length} session
                                {group.sessions.length === 1 ? "" : "s"})
                              </span>
                            )}
                          </h3>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:text-foreground",
                            isExpanded ? "rotate-0" : "-rotate-90",
                          )}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 p-4 pt-2">
                        {group.sessions.map((session) => {
                          const isActive = activeSessionId === session.id;
                          const isNextUpcoming = nextSession?.id === session.id;

                          return (
                            <div
                              key={session.id}
                              id={`session-${session.id}`}
                              ref={setSessionRef(session.id)}
                              className={cn(
                                "relative scroll-mt-20 rounded-lg transition-all duration-300",
                              )}
                            >
                              <SessionList
                                sessions={[session]}
                                isLoading={isLoading}
                                emptyMessage={
                                  searchQuery ||
                                  selectedTimeFilter !== "all" ||
                                  selectedTypeFilter !== "all"
                                    ? "No sessions match your filters"
                                    : "No sessions found"
                                }
                                onAddInsight={(sessionId, content) => {
                                  // Handle add insight when implemented
                                  console.log(
                                    "Add insight",
                                    sessionId,
                                    content,
                                  );
                                }}
                                onToggleStar={(
                                  sessionId,
                                  insightId,
                                  isStarred,
                                ) => {
                                  // Handle toggle star when implemented
                                  console.log(
                                    "Toggle star",
                                    sessionId,
                                    insightId,
                                    isStarred,
                                  );
                                }}
                                onAddAction={(sessionId, content) => {
                                  // Handle add action when implemented
                                  console.log("Add action", sessionId, content);
                                }}
                              />
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ||
                  selectedTimeFilter !== "all" ||
                  selectedTypeFilter !== "all"
                    ? "No sessions match your filters"
                    : "No sessions found"}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
