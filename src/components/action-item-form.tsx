"use client";

import dayjs from "dayjs";
import _ from "lodash";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
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
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

import { Textarea } from "./ui/textarea";

type Person = RouterOutputs["actionItems"]["getByProfileId"]["people"][number];
type Meeting =
  RouterOutputs["actionItems"]["getByProfileId"]["meetings"][number];

interface ActionItemFormProps {
  onCancel: () => void;
  onSubmit: () => void;
  meetings: Meeting[];
  people: Person[];
}

const ActionItemSchema = z.object({
  text: z.string().min(1, "Text is required"),
  meetingId: z.string().min(1, "Meeting is required"),
  dueDate: z.date().nullable(),
  assigneeIds: z.array(z.string()).default([]),
});

type ActionItemFormData = z.infer<typeof ActionItemSchema>;

export function ActionItemForm({
  onCancel,
  onSubmit,
  meetings,
  people,
}: ActionItemFormProps) {
  const { profile } = useProfile();
  const utils = api.useUtils();

  const optimisticUpdate = async (callback: () => void) => {
    await utils.actionItems.getByProfileId.cancel();
    const previousItems = utils.actionItems.getByProfileId.getData();
    callback();
    return { previousItems };
  };

  const { mutate: createActionItem } = api.actionItems.create.useMutation({
    onMutate: async (newItem) => {
      return optimisticUpdate(() => {
        utils.actionItems.getByProfileId.setData(
          { profileId: profile?.id ?? "" },
          (old) => {
            if (!old) return { actionItems: [], meetings: [], people: [] };

            const meeting = old.meetings.find(
              (m) => m.video_api_id === newItem.videoId,
            );
            if (!meeting) return old;

            return {
              ...old,
              actionItems: [
                ...old.actionItems,
                {
                  id: "temp-id",
                  api_video_id: newItem.videoId,
                  text: newItem.text,
                  due_date: newItem.dueDate ?? null,
                  completed: null,
                  completed_at: null,
                  completed_date: null,
                  created_at: new Date().toISOString(),
                  deleted_at: null,
                  server_deleted_at: null,
                  vtt_start_segment_id: null,
                  vtt_end_segment_id: null,
                  meeting,
                  assignees: (newItem.assigneeIds ?? []).map((id) => {
                    const person = old.people.find((p) => p.id === id);
                    return {
                      assignee_id: id,
                      meeting_action_item_id: "temp-id",
                      assignee: person ?? {
                        id,
                        name: "Loading...",
                        type: null,
                        attributes: null,
                        created_at: new Date().toISOString(),
                        is_test: false,
                        master_profile_id: "",
                      },
                    };
                  }),
                },
              ],
            };
          },
        );
      });
    },
    onError: (err, newItem, context) => {
      utils.actionItems.getByProfileId.setData(
        { profileId: profile?.id ?? "" },
        context?.previousItems,
      );
      toast.error("Failed to create action item", {
        description: err.message,
      });
    },
    onSuccess: () => {
      onSubmit();
      toast.success("Action item created successfully");
    },
    onSettled: () => {
      void utils.actionItems.getByProfileId.invalidate();
    },
  });

  const form = useValidatedForm(ActionItemSchema, {
    defaultValues: {
      text: "",
      meetingId: "",
      dueDate: null,
      assigneeIds: [],
    },
  });

  const handleSubmit = form.handleSubmit((data: ActionItemFormData) => {
    try {
      createActionItem({
        videoId: data.meetingId,
        text: data.text,
        dueDate: data.dueDate
          ? dayjs(data.dueDate).startOf("day").toISOString()
          : undefined,
        assigneeIds: data.assigneeIds,
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to create item. Please try again.");
    }
  });

  const sortedMeetings = _.orderBy(
    meetings,
    [
      (meeting) =>
        meeting.date ? dayjs(meeting.date).valueOf() : Number.NEGATIVE_INFINITY,
    ],
    ["desc"],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Action Item</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
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
              name="meetingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a meeting" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedMeetings.map((meeting) => (
                          <SelectItem
                            key={meeting.video_api_id}
                            value={meeting.video_api_id}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{meeting.name}</span>
                              {meeting.date && (
                                <span className="text-xs text-muted-foreground">
                                  {dayjs(meeting.date).format("MMM D, YYYY")}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ?? undefined}
                        setDate={(date) => field.onChange(date)}
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
                    <FormLabel>Assignee</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value[0] ?? ""}
                        onValueChange={(value) =>
                          field.onChange(value ? [value] : [])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an assignee" />
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
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">Add Action Item</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
