"use client";

import html2canvas from "html2canvas";
import { useState } from "react";
import { toast } from "sonner";
import { useValidatedForm } from "~/hooks/use-validated-form";
import { FeedbackInput } from "~/lib/feedbacks/schemas";
import { api } from "~/trpc/react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Textarea } from "./textarea";

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useValidatedForm(FeedbackInput, {
    defaultValues: {
      type: "suggestion",
      criticality: "low",
      description: "",
      screenshot: "",
    },
  });

  const submitFeedback = api.feedbacks.submit.useMutation({
    onSuccess: () => {
      toast.success("Feedback submitted successfully");
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Error submitting feedback: ${error.message}`);
    },
  });

  const handleSubmit = async (values: FeedbackInput) => {
    setIsSubmitting(true);
    try {
      onOpenChange(false);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const canvas = await html2canvas(document.body, {
        backgroundColor: "hsl(240 10% 2%)", // Dark mode background from globals.css
      });
      const screenshot = canvas.toDataURL("image/png");
      await submitFeedback.mutateAsync({
        ...values,
        screenshot,
      });
    } catch (error) {
      toast.error("Failed to capture screenshot");
      onOpenChange(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 w-full max-w-[425px] -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-background p-6 shadow-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Share Your Thoughts
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-4 space-y-4"
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground">
                    Feedback Type
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-2"
                    >
                      {[
                        { value: "suggestion", label: "Suggestion" },
                        { value: "improvement", label: "Improvement" },
                        { value: "bug", label: "Bug" },
                      ].map(({ value, label }) => (
                        <div key={value} className="relative">
                          <RadioGroupItem
                            value={value}
                            id={value}
                            className="peer absolute inset-0 opacity-0"
                          />
                          <Label
                            htmlFor={value}
                            className="flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/*
            <FormField
              control={form.control}
              name="criticality"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground">
                    Criticality
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      {[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ].map(({ value, label }) => (
                        <div key={value} className="relative">
                          <RadioGroupItem
                            value={value}
                            id={value}
                            className="peer absolute inset-0 opacity-0"
                          />
                          <Label
                            htmlFor={value}
                            className="flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            */}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What do you think about this feature? What do you like or dislike? What did you expect to happen?"
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={!form.formState.isValid || isSubmitting}
                className="transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
