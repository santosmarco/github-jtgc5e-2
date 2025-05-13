"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react"; // Type for icon prop

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { Badge } from "~/components/ui/badge";

// Using a more generic item type that just expects a name
export type SimpleListItem = {
  name: string;
};

export type SimpleListResultUIProps = {
  items: SimpleListItem[];
  title: string;
  icon: LucideIcon;
  totalCount?: number; // Optional: if the list is paginated or a subset
  args?: Record<string, unknown>;
};

const AnimatedBadge = motion(Badge);

const cardVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 22,
      delay: i * 0.05,
    },
  }),
  exit: { opacity: 0, x: 10, transition: { duration: 0.2 } },
};

export function SimpleListResultUI({
  items,
  title,
  icon: SectionIcon,
  totalCount,
  args,
}: SimpleListResultUIProps) {
  if (!items?.length) {
    return (
      <CollapsibleSection
        title={title}
        icon={SectionIcon}
        count={0}
        args={args}
        defaultOpen={true}
      >
        <p className="p-3 text-sm text-muted-foreground">No items found.</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={title}
      icon={SectionIcon}
      count={totalCount ?? items.length}
      args={args}
      defaultOpen={true}
    >
      <div className="flex flex-wrap gap-1.5 p-2">
        <AnimatePresence mode="sync">
          {items.map((item, index) => (
            <AnimatedBadge
              key={`${title}-${item.name}-${index}`}
              variant="secondary"
              variants={cardVariants}
              custom={index}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex items-center justify-between rounded-md border border-border bg-muted p-2 text-sm"
            >
              <span className="font-medium text-foreground">{item.name}</span>
            </AnimatedBadge>
          ))}
        </AnimatePresence>
      </div>
    </CollapsibleSection>
  );
}
