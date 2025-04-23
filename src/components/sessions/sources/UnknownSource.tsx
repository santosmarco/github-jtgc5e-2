import { motion } from "framer-motion";
import { Info } from "lucide-react";

import {
  CompactContainer,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";

interface UnknownSourceProps {
  compact?: boolean;
}

export function UnknownSource({ compact = false }: UnknownSourceProps) {
  if (compact) {
    return (
      <CompactContainer icon={<Info className="h-3.5 w-3.5" />}>
        <div className="text-xs text-muted-foreground">Unknown source type</div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<Info className="h-3.5 w-3.5" />}
        title="Unknown Source"
      />

      <motion.div
        className="flex items-center justify-center rounded-md border border-muted bg-muted/20 p-3 text-center text-xs text-muted-foreground"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex items-center gap-1.5 rounded-md p-1">
          <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span>Source details unavailable</span>
        </div>
      </motion.div>
    </SourceContainer>
  );
}
