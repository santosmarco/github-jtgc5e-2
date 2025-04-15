"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import _ from "lodash";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Tables } from "~/lib/supabase/database.types";

interface ActionItemFiltersProps {
  filters: {
    person: string;
    assignee: string[] | "all";
    meetings: string[] | "all";
    status: string;
  };
  setFilters: (filters: ActionItemFiltersProps["filters"]) => void;
  people: Tables<"entities">[];
  meetings?: Tables<"meetings">[];
}

const filterVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      mass: 1,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
};

const selectVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 14,
    },
  },
};

export function ActionItemFilters({
  filters,
  setFilters,
  people,
  meetings,
}: ActionItemFiltersProps) {
  const handleAssigneeChange = (value: string) => {
    if (value === "all") {
      setFilters({ ...filters, assignee: "all" });
    } else {
      const currentAssignees =
        filters.assignee === "all" ? [] : filters.assignee;
      const newAssignees = Array.isArray(currentAssignees)
        ? currentAssignees.includes(value)
          ? currentAssignees.filter((id) => id !== value)
          : [...currentAssignees, value]
        : [value];
      setFilters({
        ...filters,
        assignee: newAssignees.length ? newAssignees : "all",
      });
    }
  };

  const handleMeetingChange = (value: string) => {
    if (value === "all") {
      setFilters({ ...filters, meetings: "all" });
    } else {
      const currentMeetings =
        filters.meetings === "all" ? [] : filters.meetings;
      const newMeetings = Array.isArray(currentMeetings)
        ? currentMeetings.includes(value)
          ? currentMeetings.filter((id) => id !== value)
          : [...currentMeetings, value]
        : [value];
      setFilters({
        ...filters,
        meetings: newMeetings.length ? newMeetings : "all",
      });
    }
  };

  const sortedMeetings = _.orderBy(
    meetings,
    [
      (meeting) =>
        meeting.date ? dayjs(meeting.date).valueOf() : Number.NEGATIVE_INFINITY,
    ],
    ["desc"],
  );

  const renderFilterBadges = (
    items: string[],
    getLabel: (id: string) => string | undefined,
  ) => {
    const maxVisible = 3;
    const visibleItems = items.slice(0, maxVisible);
    const remainingCount = items.length - maxVisible;

    return (
      <div className="flex items-center gap-1">
        {visibleItems.map((id) => (
          <Badge key={id} variant="secondary" className="truncate text-xs">
            {getLabel(id)}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{remainingCount}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <motion.div
      variants={filterVariants}
      initial="hidden"
      animate="visible"
      className="mb-6"
    >
      <Card className="group overflow-hidden border-border bg-gradient-to-br from-background/90 to-background/70 shadow-lg transition-all duration-500 hover:border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <motion.div variants={selectVariants} className="space-y-2.5">
              <Label
                htmlFor="assignee-filter"
                className="text-xs font-medium text-foreground"
              >
                Filter by Assignees
              </Label>
              <Select value="placeholder" onValueChange={handleAssigneeChange}>
                <SelectTrigger
                  id="assignee-filter"
                  className="w-full bg-background/50 text-xs backdrop-blur-sm"
                >
                  <SelectValue placeholder="Select assignees">
                    {filters.assignee === "all"
                      ? "All assignees"
                      : Array.isArray(filters.assignee)
                        ? renderFilterBadges(
                            filters.assignee,
                            (id) => people.find((p) => p.id === id)?.name,
                          )
                        : "Select assignees"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 p-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-assignees"
                          checked={filters.assignee === "all"}
                          onCheckedChange={() => handleAssigneeChange("all")}
                        />
                        <label
                          htmlFor="all-assignees"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          All assignees
                        </label>
                      </div>
                      {_.uniqBy(people, (p) => p.name)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((person) => (
                          <div
                            key={person.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`assignee-${person.id}`}
                              checked={
                                Array.isArray(filters.assignee) &&
                                filters.assignee.includes(person.id)
                              }
                              onCheckedChange={() =>
                                handleAssigneeChange(person.id)
                              }
                            />
                            <label
                              htmlFor={`assignee-${person.id}`}
                              className="truncate text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {person.name}
                            </label>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div variants={selectVariants} className="space-y-2.5">
              <Label
                htmlFor="meetings-filter"
                className="text-xs font-medium text-foreground"
              >
                Filter by Meetings
              </Label>
              <Select value="placeholder" onValueChange={handleMeetingChange}>
                <SelectTrigger
                  id="meetings-filter"
                  className="w-full bg-background/50 text-xs backdrop-blur-sm"
                >
                  <SelectValue placeholder="Select meetings">
                    {filters.meetings === "all"
                      ? "All meetings"
                      : Array.isArray(filters.meetings)
                        ? renderFilterBadges(filters.meetings, (id) => {
                            const meetingName = meetings?.find(
                              (m) => m.video_api_id === id,
                            )?.name;

                            if (!meetingName) return undefined;

                            return meetingName.length > 20
                              ? `${meetingName.slice(0, 20)}...`
                              : meetingName;
                          })
                        : "Select meetings"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 p-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-meetings"
                          checked={filters.meetings === "all"}
                          onCheckedChange={() => handleMeetingChange("all")}
                        />
                        <label
                          htmlFor="all-meetings"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          All meetings
                        </label>
                      </div>
                      {sortedMeetings?.map((meeting) => (
                        <div
                          key={meeting.video_api_id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`meeting-${meeting.video_api_id}`}
                            checked={
                              Array.isArray(filters.meetings) &&
                              filters.meetings.includes(meeting.video_api_id)
                            }
                            onCheckedChange={() =>
                              handleMeetingChange(meeting.video_api_id)
                            }
                          />
                          <label
                            htmlFor={`meeting-${meeting.video_api_id}`}
                            className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            <span className="truncate">{meeting.name}</span>
                            {meeting.date && (
                              <span className="whitespace-nowrap text-xs text-muted-foreground">
                                {dayjs(meeting.date).format("MMM D, YYYY")}
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </SelectContent>
              </Select>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
