"use client";

import { motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  SortAscIcon,
} from "lucide-react";
import React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export type SortField = "dueDate" | "createdAt" | "title" | "meetingName";
export type SortDirection = "asc" | "desc";

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

interface ActionItemSortProps {
  sortOptions: SortOptions;
  onSortChange: (options: SortOptions) => void;
}

const sortVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const getSortLabel = (field: SortField): string => {
  switch (field) {
    case "dueDate":
      return "Due Date";
    case "createdAt":
      return "Creation Date";
    case "title":
      return "Title";
    case "meetingName":
      return "Meeting Name";
    default:
      return "Sort By";
  }
};

export function ActionItemSort({
  sortOptions,
  onSortChange,
}: ActionItemSortProps) {
  const handleSortOptionClick = (field: SortField) => {
    if (field === sortOptions.field) {
      // Toggle direction if same field
      onSortChange({
        ...sortOptions,
        direction: sortOptions.direction === "asc" ? "desc" : "asc",
      });
    } else {
      // Set new field with asc direction
      onSortChange({
        field,
        direction: "asc",
      });
    }
  };

  return (
    <motion.div
      className="inline-flex items-center"
      variants={sortVariants}
      initial="hidden"
      animate="visible"
    >
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex h-8 items-center gap-1 bg-background/50 text-xs backdrop-blur-sm"
              >
                <SortAscIcon className="size-3.5" />
                {getSortLabel(sortOptions.field)}
                {sortOptions.direction === "asc" ? (
                  <ArrowUpIcon className="size-3.5 opacity-70" />
                ) : (
                  <ArrowDownIcon className="size-3.5 opacity-70" />
                )}
                <ChevronDownIcon className="size-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Sort action items</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className={sortOptions.field === "dueDate" ? "bg-accent/50" : ""}
            onClick={() => handleSortOptionClick("dueDate")}
          >
            Due Date
            {sortOptions.field === "dueDate" && (
              <span className="ml-auto">
                {sortOptions.direction === "asc" ? (
                  <ArrowUpIcon className="size-3.5" />
                ) : (
                  <ArrowDownIcon className="size-3.5" />
                )}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            className={sortOptions.field === "createdAt" ? "bg-accent/50" : ""}
            onClick={() => handleSortOptionClick("createdAt")}
          >
            Creation Date
            {sortOptions.field === "createdAt" && (
              <span className="ml-auto">
                {sortOptions.direction === "asc" ? (
                  <ArrowUpIcon className="size-3.5" />
                ) : (
                  <ArrowDownIcon className="size-3.5" />
                )}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            className={sortOptions.field === "title" ? "bg-accent/50" : ""}
            onClick={() => handleSortOptionClick("title")}
          >
            Title
            {sortOptions.field === "title" && (
              <span className="ml-auto">
                {sortOptions.direction === "asc" ? (
                  <ArrowUpIcon className="size-3.5" />
                ) : (
                  <ArrowDownIcon className="size-3.5" />
                )}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            className={
              sortOptions.field === "meetingName" ? "bg-accent/50" : ""
            }
            onClick={() => handleSortOptionClick("meetingName")}
          >
            Meeting Name
            {sortOptions.field === "meetingName" && (
              <span className="ml-auto">
                {sortOptions.direction === "asc" ? (
                  <ArrowUpIcon className="size-3.5" />
                ) : (
                  <ArrowDownIcon className="size-3.5" />
                )}
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
