"use client";

import { motion } from "framer-motion";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";

interface VideoPageHeaderProps {
  title: string;
  // Setting button click handler would be defined in a future task
  // onSettingsClick?: () => void;
}

export function VideoPageHeader({ title }: VideoPageHeaderProps) {
  const router = useRouter();

  return (
    <motion.header
      className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background px-6 shadow-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="rounded-full"
        aria-label="Go back"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <motion.h1
        className="max-w-[60%] truncate text-lg font-semibold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
      >
        {title}
      </motion.h1>

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label="More options"
        onClick={() => console.log("More options clicked - TBD")}
      >
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </motion.header>
  );
}
