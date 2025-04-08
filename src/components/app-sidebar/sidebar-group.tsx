"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "~/lib/utils";

import type { GroupMenuItem } from "./menu-types";

interface SidebarGroupProps {
  group: GroupMenuItem;
  onNavClick?: () => void;
  pathname: string;
}

const AnimatedLink = motion(Link);
const AnimatedChevronDown = motion(ChevronDown);

export function SidebarGroup({
  group,
  onNavClick,
  pathname,
}: SidebarGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(group.isCollapsed ?? true);

  const handleGroupClick = (e: React.MouseEvent) => {
    const defaultHref = group.defaultHref || group.children[0]?.href || "/";
    // Handle navigation for the rest of the group header
    if (
      pathname === defaultHref ||
      (defaultHref === "/" && pathname.startsWith("/videos")) ||
      (pathname.startsWith(defaultHref) && defaultHref !== "/")
    ) {
      e.preventDefault();
      return;
    }

    // Only call onNavClick after we've decided not to prevent navigation
    onNavClick?.();
  };

  return (
    <div className="space-y-1">
      {/* Group Header */}
      <AnimatedLink
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        href={group.defaultHref || group.children[0]?.href || "#"}
        onClick={handleGroupClick}
        className={cn(
          "group relative flex w-full items-center justify-between rounded-sm py-2.5 pl-8 pr-6 text-muted-foreground transition-all hover:bg-primary/10 hover:text-foreground",
          group.isActive &&
            "text-primary before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-1.5 before:rounded-r before:bg-primary hover:text-primary",
        )}
      >
        <motion.div className="flex flex-1 items-center gap-6">
          <span>{group.icon}</span>
          <motion.span
            initial={{ x: -5, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-sm"
          >
            {group.label}
          </motion.span>
        </motion.div>
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          className="flex h-8 w-8 flex-1 items-center justify-end rounded-sm text-right text-muted-foreground transition-all group-hover:text-foreground"
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.label} group`}
        >
          <AnimatedChevronDown
            initial={{ rotate: isCollapsed ? -90 : 0 }}
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.2 }}
            className="h-4 w-4 transition-transform duration-200"
          />
        </motion.button>
      </AnimatedLink>

      {/* Collapsible Children */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 space-y-1 border-l border-border/50 pl-4">
              {group.children.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (
                      pathname === item.href ||
                      (item.href === "/" && pathname.startsWith("/videos")) ||
                      (pathname.startsWith(item.href) && item.href !== "/")
                    ) {
                      e.preventDefault();
                    }
                    onNavClick?.();
                  }}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "group relative flex items-center gap-6 rounded-sm px-4 py-3 text-muted-foreground transition-all hover:bg-primary/10",
                      item.isActive ? "text-primary" : "hover:text-foreground",
                    )}
                  >
                    <span>{item.icon}</span>
                    <motion.span
                      initial={{ x: -5, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="text-sm"
                    >
                      {item.label}
                    </motion.span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
