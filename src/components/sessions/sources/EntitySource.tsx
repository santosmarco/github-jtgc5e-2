import { motion } from "framer-motion";
import { User } from "lucide-react";

import { Badge } from "~/components/ui/badge";

import {
  AnimatedBadge,
  badgePulseAnimation,
  CompactContainer,
  ContentSection,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { EntityData, SourceProps } from "./SourceItemFactory";

export function EntitySource({
  data,
  compact = false,
}: SourceProps<EntityData>) {
  if (compact) {
    return (
      <CompactContainer icon={<User className="h-3.5 w-3.5" />}>
        <div className="flex gap-1.5 text-xs">
          <span className="line-clamp-1 font-medium">{data.data.name}</span>
          <motion.div animate={badgePulseAnimation}>
            <Badge
              variant="outline"
              className="h-4 shrink-0 bg-primary/10 px-1 text-[10px] font-medium"
            >
              {data.data.type}
            </Badge>
          </motion.div>
        </div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<User className="h-3.5 w-3.5" />}
        title={data.data.name}
        badge={
          <AnimatedBadge className="h-5 bg-primary/10 px-1.5 text-[11px] font-medium tracking-wide shadow-sm">
            {data.data.type}
          </AnimatedBadge>
        }
      />

      {data.data.description && (
        <ContentSection>
          <p className="text-xs leading-relaxed text-foreground/90">
            {data.data.description}
          </p>
        </ContentSection>
      )}
    </SourceContainer>
  );
}
