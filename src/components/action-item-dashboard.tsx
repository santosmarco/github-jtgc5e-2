"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { ActionItemFilters } from "~/components/action-item-filters";
import { ActionItemForm } from "~/components/action-item-form";
import { ActionItemList } from "~/components/action-item-list";
import { SpecialViews } from "~/components/special-views";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const gradientVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function ActionItemDashboard() {
  const { profile } = useProfile();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<{
    person: string;
    assignee: string[] | "all";
    meetings: string[] | "all";
    status: string;
  }>({
    person: "",
    assignee: "all",
    meetings: "all",
    status: "all",
  });
  const [optimisticDeletes, setOptimisticDeletes] = useState(new Set<string>());
  const [optimisticCompletions, setOptimisticCompletions] = useState(
    new Map<string, boolean>(),
  );

  const today = dayjs().format("YYYY-MM-DD");
  const utils = api.useUtils();

  const { data, isLoading } = api.actionItems.getByProfileId.useQuery(
    {
      profileId: profile?.id ?? "",
    },
    {
      enabled: !!profile?.id,
    },
  );

  const processedItems = useMemo(() => {
    if (!data?.actionItems) return [];

    const items = data.actionItems
      .filter((item) => !optimisticDeletes.has(item.id))
      .map((item) => ({
        ...item,
        completed_at: optimisticCompletions.has(item.id)
          ? optimisticCompletions.get(item.id)
            ? new Date().toISOString()
            : null
          : item.completed_at,
      }));

    return items.sort((a, b) => {
      if (a.completed_at === null && b.completed_at !== null) return -1;
      if (a.completed_at !== null && b.completed_at === null) return 1;
      return 0;
    });
  }, [data?.actionItems, optimisticDeletes, optimisticCompletions]);

  const filteredItems = processedItems.filter((item) => {
    const personMatch =
      !filters.person ||
      item.assignees.some((a) => a.assignee.id === filters.person);

    const assigneeMatch =
      filters.assignee === "all" ||
      (Array.isArray(filters.assignee) &&
        item.assignees.some((a) => filters.assignee.includes(a.assignee.id)));

    const meetingsMatch =
      filters.meetings === "all" ||
      (Array.isArray(filters.meetings) &&
        filters.meetings.includes(item.meeting?.video_api_id || ""));

    const statusMatch =
      filters.status === "all" ||
      (filters.status === "completed" && item.completed_at) ||
      (filters.status === "incomplete" && !item.completed_at);

    return personMatch && assigneeMatch && meetingsMatch && statusMatch;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative -mx-12 -mt-12 p-8"
    >
      <motion.div
        variants={gradientVariants}
        initial="initial"
        animate="animate"
        className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-primary/10 via-background to-background"
      />

      <motion.div
        variants={itemVariants}
        className="relative mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-start"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Action Item Manager
          </h1>
          <p className="text-xs text-muted-foreground">
            Track and manage your meeting action items
          </p>
        </div>
        <Button onClick={() => setShowForm((curr) => !curr)} size="sm">
          <PlusCircle className="size-3.5" />
          New Action Item
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <ActionItemFilters
            filters={filters}
            setFilters={setFilters}
            people={data?.people ?? []}
            meetings={data?.meetings ?? []}
          />

          <AnimatePresence mode="wait">
            {showForm && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6"
              >
                <ActionItemForm
                  onSubmit={() => setShowForm(false)}
                  onCancel={() => setShowForm(false)}
                  meetings={data?.meetings ?? []}
                  people={data?.people ?? []}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading ? (
            <motion.div className="space-y-4" variants={containerVariants}>
              {[1, 2, 3].map((i) => (
                <motion.div key={i} variants={itemVariants} custom={i}>
                  <Skeleton className="h-[120px] w-full rounded-xl" />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <ActionItemList
              items={filteredItems ?? []}
              people={data?.people ?? []}
            />
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SpecialViews
            actionItems={filteredItems ?? []}
            today={today}
            loading={isLoading}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
