import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, ChevronUp, MessageSquare, SendIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import type { ReportComment } from "~/types/reports";
import { cn } from "~/lib/utils";

type CommentsPanelProps = {
  reportId: string;
  comments: ReportComment[];
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSubmitComment: (reportId: string, content: string) => void;
  isPendingSubmit: boolean;
};

export const CommentsPanel = ({
  reportId,
  comments,
  isVisible,
  onToggleVisibility,
  onSubmitComment,
  isPendingSubmit,
}: CommentsPanelProps) => {
  const [commentContent, setCommentContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!commentContent.trim() || isPendingSubmit) return;

    setIsSubmitting(true);
    onSubmitComment(reportId, commentContent.trim());

    // Reset submission state after animation completes
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const commentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: "easeOut",
      },
    }),
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  };

  const panelVariants = {
    hidden: { x: "100%", opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: {
      x: "100%",
      opacity: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
      },
    },
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.div
            key="comments"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute -top-2 right-0 z-30 h-[calc(100vh-12rem)] w-[300px] rounded-sm border bg-background shadow-lg"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex h-12 items-center justify-between border-b px-4"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium">Comments</h2>
                {comments.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary"
                  >
                    {comments.length}
                  </motion.span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleVisibility}
                className="-mr-2 h-full w-8 text-foreground hover:bg-transparent hover:text-muted-foreground"
              >
                <ChevronUp className="h-4 w-4 rotate-90" />
              </Button>
            </motion.div>

            <div className="flex h-[calc(100%-6rem)] flex-col justify-between py-4">
              <div className="scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent -mr-2 flex-1 space-y-4 overflow-y-auto px-4 pr-6">
                <AnimatePresence>
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        custom={index}
                        variants={commentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="group relative flex gap-2 rounded-lg"
                        whileHover={{
                          scale: 1.01,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <div className="w-full min-w-0">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <motion.span
                              initial={{ color: "#000" }}
                              whileHover={{ color: "var(--primary)" }}
                              className="truncate font-medium text-primary"
                            >
                              {comment.user.nickname}
                            </motion.span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {comment.content}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex h-full flex-col items-center justify-center py-10 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                          delay: 0.3,
                        }}
                        className="mb-3 rounded-full bg-primary/5 p-4"
                      >
                        <MessageSquare className="h-6 w-6 text-primary/60" />
                      </motion.div>
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm font-medium"
                      >
                        No comments yet
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-1 max-w-[200px] text-xs text-muted-foreground"
                      >
                        Be the first to share your thoughts on this report
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute inset-x-0 bottom-0 rounded-b-lg border-t bg-background"
              >
                <form onSubmit={handleSubmit} className="relative space-y-2">
                  <Textarea
                    placeholder="Write a comment... (Press Enter to submit)"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    rows={3}
                    className={cn(
                      "resize-none rounded-lg border-none bg-muted/50 pr-10 placeholder:text-muted-foreground/50 focus-visible:ring-0",
                      isPendingSubmit && "opacity-70",
                    )}
                    disabled={isPendingSubmit}
                  />
                  <motion.button
                    type="submit"
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    disabled={isPendingSubmit || !commentContent.trim()}
                    className={cn(
                      "absolute bottom-3 right-3 rounded-full p-1.5 text-primary transition-colors",
                      commentContent.trim()
                        ? "bg-primary/10 hover:bg-primary/20"
                        : "text-muted-foreground/40",
                      isPendingSubmit && "opacity-50",
                    )}
                  >
                    <SendIcon
                      className={cn("h-4 w-4", isSubmitting && "animate-ping")}
                    />
                  </motion.button>
                </form>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="toggle"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute -right-14 -top-2 h-8"
          >
            <motion.div
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleVisibility}
                className="group relative flex h-8 items-center gap-1 rounded-l-full rounded-r-none border-r px-0 pr-2 shadow-sm"
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full">
                  <motion.div
                    animate={{ x: [0, -3, 0] }}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "mirror",
                      duration: 1.5,
                      repeatDelay: 2,
                    }}
                  >
                    <ChevronLeft className="ml-1 h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                  </motion.div>
                </div>
                <span className="pr-4 text-xs font-medium leading-none">
                  {comments.length > 0 ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 15,
                        }}
                        className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-medium text-primary"
                      >
                        {comments.length}
                      </motion.span>
                      Comments
                    </motion.span>
                  ) : (
                    "Comments"
                  )}
                </span>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
