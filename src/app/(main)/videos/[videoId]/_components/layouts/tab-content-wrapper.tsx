"use client";

import { Slot } from "@radix-ui/react-slot";
import { motion, type Variants } from "framer-motion";

import { cn } from "~/lib/utils";

import { ContentContainer } from "../content-container";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
} as const satisfies Variants;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
} as const satisfies Variants;

type TitleProps = {
  children: React.ReactNode;
};

function Title({ children }: TitleProps) {
  return <h2 className="text-lg font-semibold text-foreground">{children}</h2>;
}

type SubtitleProps = {
  children: React.ReactNode;
};

function Subtitle({ children }: SubtitleProps) {
  return <p className="mt-1 text-sm text-muted-foreground">{children}</p>;
}

type HeaderProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
};

function Header({ title, subtitle, icon, actions }: HeaderProps) {
  if (!title && !subtitle && !actions) return null;

  return (
    <motion.div variants={itemVariants} className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {title &&
            (icon ? (
              <div className="flex items-center gap-2">
                <Slot className="h-5 w-5 text-primary">{icon}</Slot>
                <Title>{title}</Title>
              </div>
            ) : (
              <Title>{title}</Title>
            ))}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {subtitle && <Subtitle>{subtitle}</Subtitle>}
    </motion.div>
  );
}

type LoadingStateProps = {
  loadingMessage: string;
};

function LoadingState({ loadingMessage }: LoadingStateProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex h-full w-full flex-col items-center justify-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>

      <p className="mt-4 text-sm font-medium text-muted-foreground">
        {loadingMessage}
      </p>
    </motion.div>
  );
}

type EmptyStateProps = {
  emptyMessage: string;
  icon?: React.ReactNode;
};

function EmptyState({ emptyMessage, icon }: EmptyStateProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex h-full w-full flex-col items-center justify-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon || (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
            role="img"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        )}
      </div>

      <p className="mt-4 text-sm font-medium text-muted-foreground">
        {emptyMessage}
      </p>
    </motion.div>
  );
}

export type TabContentWrapperProps = {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
};

export function TabContentWrapper({
  children,
  className,
  icon,
  title,
  subtitle,
  actions,
  empty = false,
  emptyMessage = "No content available",
  isLoading = false,
  loadingMessage = "Loading...",
}: TabContentWrapperProps): JSX.Element {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn("h-full w-full px-8 pt-4", className)}
    >
      <Header title={title} subtitle={subtitle} icon={icon} actions={actions} />

      {isLoading ? (
        <LoadingState loadingMessage={loadingMessage} />
      ) : empty ? (
        <EmptyState emptyMessage={emptyMessage} icon={icon} />
      ) : (
        <ContentContainer>{children}</ContentContainer>
      )}
    </motion.div>
  );
}
