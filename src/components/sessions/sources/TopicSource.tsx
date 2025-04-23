import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

import {
  AnimatedBadge,
  CompactContainer,
  ContentSection,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { SourceProps, TopicData } from "./SourceItemFactory";

export function TopicSource({ data, compact = false }: SourceProps<TopicData>) {
  if (compact) {
    return (
      <CompactContainer icon={<MessageSquare className="h-3.5 w-3.5" />}>
        <div className="line-clamp-1 text-xs font-medium">
          {data.data.title}
        </div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        title={data.data.title}
        badge={<AnimatedBadge>Topic</AnimatedBadge>}
      />

      <ContentSection>
        <div className="relative">
          {/* Decorative quote marks */}
          <motion.div
            className="absolute -left-1 -top-1 text-lg text-primary/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            &ldquo;
          </motion.div>
          <motion.div
            className="absolute -bottom-3 -right-1 text-lg text-primary/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            &rdquo;
          </motion.div>

          <p className="px-1 text-xs leading-relaxed text-foreground/90">
            {data.data.summary}
          </p>
        </div>
      </ContentSection>
    </SourceContainer>
  );
}
