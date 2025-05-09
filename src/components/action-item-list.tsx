"use client";

import { PersonIcon } from "@radix-ui/react-icons";
import dayjs from "dayjs";
import { AnimatePresence, type Variants, motion } from "framer-motion";
import _ from "lodash";
import {
  CheckCircle2,
  Circle,
  ClockIcon,
  ListTodo,
  Pencil,
  Trash2,
  VideoIcon,
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Virtuoso } from "react-virtuoso";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useProfile } from "~/hooks/use-profile";
import { useValidatedForm } from "~/hooks/use-validated-form";
import { cn, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

import { Link } from "./ui/link";
import { Textarea } from "./ui/textarea";

type ActionItem =
  RouterOutputs["actionItems"]["getByProfileId"]["actionItems"][number];
type Person = RouterOutputs["actionItems"]["getByProfileId"]["people"][number];

interface ActionItemListProps {
  items: ActionItem[];
  people: Person[];
}

const ActionItemSchema = z.object({
  text: z.string().min(1, "Text is required"),
  dueDate: z.date().nullable(),
  assigneeIds: z.array(z.string()).default([]),
});

type ActionItemFormData = z.infer<typeof ActionItemSchema>;

interface EditingItem {
  id: string;
  text: string;
  dueDate: Date | null;
  assigneeIds: string[];
}

const animations = {
  card: {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 0.8,
        delay: i * 0.1,
        duration: 0.6,
      },
    }),
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -20,
      transition: {
        duration: 0.3,
        ease: "anticipate",
      },
    },
  },

  checkbox: {
    checked: {
      scale: [1, 1.2, 1],
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 0.4,
        ease: "easeInOut",
        times: [0, 0.2, 0.5, 1],
      },
    },
    unchecked: {
      scale: 1,
      rotate: 0,
    },
  },

  indicators: {
    container: {
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          staggerChildren: 0.1,
          delayChildren: 0.2,
        },
      },
    },
    item: {
      hidden: { opacity: 0, x: -10 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          type: "spring",
          stiffness: 200,
          damping: 20,
        },
      },
    },
  },

  emptyState: {
    container: {
      hidden: { opacity: 0, scale: 0.8, y: 20 },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.8,
          staggerChildren: 0.2,
        },
      },
    },
    icon: {
      hidden: { opacity: 0, scale: 0 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 15,
        },
      },
    },
    text: {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 25,
        },
      },
    },
  },
} as const satisfies Record<string, Variants | Record<string, Variants>>;

export function ActionItemList({ items, people }: ActionItemListProps) {
  const { profile } = useProfile();
  const [editingItem, setEditingItem] = React.useState<EditingItem | null>(
    null,
  );
  const utils = api.useUtils();
  const virtuosoRef = useRef(null);

  const optimisticUpdate = async (callback: () => void) => {
    await utils.actionItems.getByProfileId.cancel();
    const previousItems = utils.actionItems.getByProfileId.getData();
    callback();
    return { previousItems };
  };

  const handleError = (
    _: unknown,
    __: unknown,
    context:
      | {
          previousItems: Parameters<
            typeof utils.actionItems.getByProfileId.setData
          >[1];
        }
      | undefined,
  ) => {
    if (context?.previousItems) {
      utils.actionItems.getByProfileId.setData(
        { profileId: profile?.id ?? "" },
        context.previousItems,
      );
    }
  };

  const { mutate: updateActionItem } = api.actionItems.update.useMutation({
    onMutate: async ({ id, text, dueDate, assigneeIds }) => {
      return optimisticUpdate(() => {
        utils.actionItems.getByProfileId.setData(
          { profileId: profile?.id ?? "" },
          (old) => {
            if (!old) return { actionItems: [], meetings: [], people: [] };
            return {
              ...old,
              actionItems: old.actionItems.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      text: text ?? item.text,
                      due_date: dueDate
                        ? dayjs(dueDate).startOf("day").toISOString()
                        : null,
                      assignees: (assigneeIds ?? []).map((assigneeId) => ({
                        assignee_id: assigneeId,
                        meeting_action_item_id: id,
                        assignee: old.people.find(
                          (p) => p.id === assigneeId,
                        ) ?? {
                          id: assigneeId,
                          name: "Loading...",
                          created_at: new Date().toISOString(),
                          is_test: false,
                          master_profile_id: "",
                          type: null,
                          attributes: null,
                        },
                      })),
                    }
                  : item,
              ),
            };
          },
        );
      });
    },
    onError: handleError,
    onSettled: () => {
      void utils.actionItems.getByProfileId.invalidate();
      setEditingItem(null);
    },
  });

  const { mutate: deleteActionItem } = api.actionItems.delete.useMutation({
    onMutate: async (deleteId) => {
      return optimisticUpdate(() => {
        utils.actionItems.getByProfileId.setData(
          { profileId: profile?.id ?? "" },
          (old) => {
            if (!old) return { actionItems: [], meetings: [], people: [] };
            return {
              ...old,
              actionItems: old.actionItems.filter(
                (item) => item.id !== deleteId.id,
              ),
            };
          },
        );
      });
    },
    onError: handleError,
    onSettled: () => {
      void utils.actionItems.getByProfileId.invalidate();
    },
  });

  const { mutate: toggleComplete } = api.actionItems.toggleComplete.useMutation(
    {
      onMutate: async ({ id }) => {
        return optimisticUpdate(() => {
          utils.actionItems.getByProfileId.setData(
            { profileId: profile?.id ?? "" },
            (old) => {
              if (!old) return { actionItems: [], meetings: [], people: [] };
              return {
                ...old,
                actionItems: old.actionItems.map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        completed_at: item.completed_at
                          ? null
                          : dayjs().startOf("day").toISOString(),
                      }
                    : item,
                ),
              };
            },
          );
        });
      },
      onError: handleError,
      onSettled: () => {
        void utils.actionItems.getByProfileId.invalidate();
      },
    },
  );

  const form = useValidatedForm(ActionItemSchema, {
    defaultValues: {
      text: editingItem?.text ?? "",
      dueDate: editingItem?.dueDate
        ? dayjs(editingItem.dueDate).startOf("day").toDate()
        : null,
      assigneeIds: editingItem?.assigneeIds ?? [],
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({
        text: editingItem.text,
        dueDate: editingItem.dueDate
          ? dayjs(editingItem.dueDate).startOf("day").toDate()
          : null,
        assigneeIds: editingItem.assigneeIds,
      });
    }
  }, [editingItem, form]);

  const handleSubmit = form.handleSubmit((data: ActionItemFormData) => {
    if (!editingItem) return;
    updateActionItem({
      id: editingItem.id,
      text: data.text,
      dueDate: data.dueDate
        ? dayjs(data.dueDate).startOf("day").toISOString()
        : undefined,
      assigneeIds: data.assigneeIds,
    });
  });

  if (items.length === 0) {
    return (
      <motion.div
        variants={animations.emptyState.container}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <Card className="mb-6 px-0">
          <CardContent className="pt-6">
            <div className="flex min-h-[120px] flex-col items-center justify-center gap-3">
              <motion.div
                variants={animations.emptyState.icon}
                animate={{
                  rotate: [0, -5, 5, -5, 5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1,
                }}
                className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 shadow-lg"
              >
                <ListTodo className="h-7 w-7 text-primary" />
              </motion.div>
              <motion.p
                variants={animations.emptyState.text}
                className="text-center text-sm font-medium"
              >
                No action items found
              </motion.p>
              <motion.p
                variants={animations.emptyState.text}
                className="text-center text-xs text-muted-foreground"
              >
                No action items found matching your filters.
              </motion.p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const ActionItemCard = React.memo(function ActionItemCard({
    item,
    index,
  }: {
    item: ActionItem;
    index: number;
  }) {
    return (
      <motion.div
        custom={index}
        variants={animations.card}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
        className="py-1.5"
      >
        <Card
          className={cn(
            "group relative overflow-hidden transition-all duration-500",
            item.completed_at
              ? "border-emerald-500/30 bg-emerald-50/10 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20"
              : "bg-gradient-to-br from-background/90 to-background/70 hover:shadow-lg",
          )}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-emerald-500/0 to-emerald-500/5"
            initial={{ opacity: 0, scale: 0.95 }}
            whileHover={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          />

          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <motion.div
                  variants={animations.checkbox}
                  initial={false}
                  animate={item.completed_at ? "checked" : "unchecked"}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    onClick={() =>
                      toggleComplete({
                        id: item.id,
                        completed: !item.completed_at,
                      })
                    }
                  >
                    {item.completed_at ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn(
                    "text-sm font-medium",
                    item.completed_at &&
                      "text-emerald-500/50 line-through decoration-emerald-500/50",
                  )}
                >
                  {item.text}
                </motion.div>
              </div>

              <div className="flex gap-2">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="pr-0.5"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100",
                      item.completed_at && "hover:text-emerald-500",
                    )}
                    onClick={() =>
                      setEditingItem({
                        id: item.id,
                        text: item.text,
                        dueDate: item.due_date
                          ? dayjs(item.due_date).startOf("day").toDate()
                          : null,
                        assigneeIds: item.assignees.map((a) => a.assignee.id),
                      })
                    }
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="pr-0.5"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 h-4 w-4 shrink-0 text-destructive-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => deleteActionItem({ id: item.id })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </motion.div>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="ml-6 pb-4">
            <div className="flex items-center justify-between gap-4">
              <motion.div
                variants={animations.indicators.container}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-4"
              >
                {item.due_date && (
                  <motion.div variants={animations.indicators.item}>
                    <ActionItemCardIndicator
                      Icon={ClockIcon}
                      text={`Due: ${formatDate(
                        dayjs(item.due_date).startOf("day").toISOString(),
                      )}`}
                      isCompleted={!!item.completed_at}
                    />
                  </motion.div>
                )}

                {item.assignees.length > 0 && (
                  <motion.div variants={animations.indicators.item}>
                    <ActionItemCardIndicator
                      Icon={PersonIcon}
                      text={`Assigned to: ${item.assignees
                        .map((assignee) => assignee.assignee.name)
                        .join(", ")}`}
                      isCompleted={!!item.completed_at}
                    />
                  </motion.div>
                )}

                {item.meeting?.name && (
                  <motion.div variants={animations.indicators.item}>
                    <ActionItemCardIndicator
                      Icon={VideoIcon}
                      text={
                        <Link
                          href={`/videos/${item.meeting.video_api_id}`}
                          className="no-underline transition-colors duration-100 hover:text-primary group-hover:underline group-hover:underline-offset-4"
                        >
                          {item.meeting.name.length > 20
                            ? `${item.meeting.name.slice(0, 20)}...`
                            : item.meeting.name}
                        </Link>
                      }
                      isCompleted={!!item.completed_at}
                    />
                  </motion.div>
                )}
              </motion.div>

              <motion.div variants={animations.indicators.item}>
                <ActionItemCardIndicator
                  text={`Created at ${formatDate(item.created_at)}`}
                  isCompleted={!!item.completed_at}
                />
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  });

  return (
    <>
      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.12,
            },
          },
        }}
      >
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: "100vh", minHeight: "400px" }}
          totalCount={items.length}
          overscan={10}
          itemContent={(index) => (
            <ActionItemCard item={items[index]!} index={index} />
          )}
        />
      </motion.div>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter action item description..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={
                          field.value
                            ? dayjs(field.value).startOf("day").toDate()
                            : undefined
                        }
                        setDate={(date) =>
                          field.onChange(
                            date ? dayjs(date).startOf("day").toDate() : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigneeIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignees</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value[0] ?? ""}
                        onValueChange={(value) =>
                          field.onChange(value ? [value] : [])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ActionItemCardIndicatorProps {
  Icon?: React.ElementType;
  text: React.ReactNode;
  isCompleted: boolean;
}

function ActionItemCardIndicator({
  Icon,
  text,
  isCompleted,
}: ActionItemCardIndicatorProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-all duration-300 group-hover:text-foreground/70",
        isCompleted &&
          "text-muted-foreground/50 group-hover:text-muted-foreground",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {text}
    </motion.div>
  );
}
