import { motion } from "framer-motion";
import { Users } from "lucide-react";

import { Badge } from "~/components/ui/badge";

import {
  CompactContainer,
  ContentSection,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { RelationshipData, SourceProps } from "./SourceItemFactory";

export function RelationshipSource({
  data,
  compact = false,
}: SourceProps<RelationshipData>) {
  if (compact) {
    return (
      <CompactContainer icon={<Users className="h-3.5 w-3.5" />}>
        <div className="flex items-center gap-1 text-xs">
          <span className="line-clamp-1 font-medium">
            {data.data.subjectEntityName}
          </span>
          <motion.span
            className="flex-shrink-0 text-primary/70"
            animate={{
              x: [0, 1.5, 0],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.8,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "mirror",
            }}
          >
            →
          </motion.span>
          <span className="line-clamp-1 font-medium">
            {data.data.objectEntityName}
          </span>
        </div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<Users className="h-3.5 w-3.5" />}
        title="Relationship"
      />

      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ x: -5, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              delay: 0.1,
            }}
          >
            <Badge
              variant="secondary"
              className="h-6 bg-background px-2 text-xs font-medium shadow-sm"
            >
              {data.data.subjectEntityName}
            </Badge>
          </motion.div>

          <motion.span
            className="text-primary/70"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: [0, 3, 0],
            }}
            transition={{
              opacity: { delay: 0.3, duration: 0.3 },
              x: {
                delay: 0.6,
                duration: 1.8,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "mirror",
              },
            }}
          >
            →
          </motion.span>

          <motion.div
            initial={{ x: 5, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              delay: 0.2,
            }}
          >
            <Badge
              variant="secondary"
              className="h-6 bg-background px-2 text-xs font-medium shadow-sm"
            >
              {data.data.objectEntityName}
            </Badge>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="mt-2 flex items-center justify-center"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 450,
          damping: 25,
          mass: 0.9,
        }}
      >
        <motion.div
          className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{
            scale: 1.03,
            backgroundColor: "rgba(var(--primary), 0.2)",
          }}
          transition={{
            delay: 0.3,
            type: "spring",
            stiffness: 500,
            damping: 25,
          }}
        >
          {data.data.relationshipType}
        </motion.div>
      </motion.div>
    </SourceContainer>
  );
}
