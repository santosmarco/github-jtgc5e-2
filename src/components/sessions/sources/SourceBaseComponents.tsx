import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  Info,
  MessageSquare,
  Target,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";

// Animation variants for components
export const contentVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 450,
      damping: 25,
      mass: 0.9,
    },
  },
  exit: {
    opacity: 0,
    y: 3,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
};

export const headerVariants = {
  hidden: { opacity: 0, y: -5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 28,
      mass: 0.8,
      delay: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
};

export const detailsVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, x: -3 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 450,
      damping: 25,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    x: -2,
    transition: {
      duration: 0.15,
    },
  },
};

export const sourceAnimVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 550,
      damping: 22,
      mass: 0.7,
      delay: 0.12,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
};

// Badge animation for pulse effect
export const badgePulseAnimation = {
  scale: [1, 1.05, 1],
  opacity: [1, 0.9, 1],
  transition: {
    duration: 1.5,
    repeat: Number.POSITIVE_INFINITY,
    repeatType: "mirror" as const,
  },
};

// Icon mapping for source types
export function getSourceIcon(type: string) {
  switch (type) {
    case "moment":
      return <Target className="h-3.5 w-3.5 text-primary/90" />;
    case "entity":
      return <User className="h-3.5 w-3.5 text-primary/90" />;
    case "relationship":
      return <Users className="h-3.5 w-3.5 text-primary/90" />;
    case "entity_observation":
    case "relationship_observation":
    case "topic_observation":
      return <MessageSquare className="h-3.5 w-3.5 text-primary/90" />;
    case "topic":
    case "topic_discussed":
      return <MessageSquare className="h-3.5 w-3.5 text-primary/90" />;
    case "action_item":
      return <CheckCircle className="h-3.5 w-3.5 text-primary/90" />;
    case "meeting":
      return <Calendar className="h-3.5 w-3.5 text-primary/90" />;
    default:
      return <Info className="h-3.5 w-3.5 text-primary/90" />;
  }
}

// Reusable source container component
interface SourceContainerProps {
  children: ReactNode;
}

export function SourceContainer({ children }: SourceContainerProps) {
  return (
    <motion.div
      className="space-y-3"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={detailsVariants}
    >
      {children}
    </motion.div>
  );
}

// Reusable source header component
interface SourceHeaderProps {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  subtitle?: ReactNode;
}

export function SourceHeader({
  icon,
  title,
  badge,
  subtitle,
}: SourceHeaderProps) {
  return (
    <motion.div className="flex items-start gap-2.5" variants={headerVariants}>
      <motion.div
        className="-mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary"
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {icon}
      </motion.div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h4>
          {badge}
        </div>
        {subtitle}
      </div>
    </motion.div>
  );
}

// Reusable content section component
interface ContentSectionProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function ContentSection({
  children,
  label,
  className,
}: ContentSectionProps) {
  return (
    <motion.div
      className={`rounded-md border border-primary/10 bg-muted p-2.5 ${className || ""}`}
      variants={contentVariants}
      transition={{ duration: 0.2 }}
    >
      {label && (
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-primary/70">
          {label}
        </div>
      )}
      {children}
    </motion.div>
  );
}

// Reusable metadata item component
interface MetadataItemProps {
  icon: ReactNode;
  children: ReactNode;
}

export function MetadataItem({ icon, children }: MetadataItemProps) {
  return (
    <motion.div
      className="flex items-center gap-1.5 rounded-md border border-primary/10 bg-muted/20 p-1.5 text-[11px] text-muted-foreground"
      variants={itemVariants}
    >
      {icon}
      <span>{children}</span>
    </motion.div>
  );
}

// Animated badge component
interface AnimatedBadgeProps {
  children: ReactNode;
  variant?: "outline" | "secondary" | "default";
  className?: string;
}

export function AnimatedBadge({
  children,
  variant = "outline",
  className = "h-5 shrink-0 bg-primary/10 px-1.5 text-[10px] font-medium",
}: AnimatedBadgeProps) {
  return (
    <motion.div variants={sourceAnimVariants}>
      <Badge variant={variant} className={className}>
        {children}
      </Badge>
    </motion.div>
  );
}

// Compact container component
interface CompactContainerProps {
  icon: ReactNode;
  children: ReactNode;
}

export function CompactContainer({ icon, children }: CompactContainerProps) {
  return (
    <motion.div
      className="flex w-full items-center gap-1.5 overflow-hidden px-1 py-0.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex-shrink-0 text-primary/80"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "mirror",
        }}
      >
        {icon}
      </motion.div>
      <div className="min-w-0 flex-1">{children}</div>
    </motion.div>
  );
}
