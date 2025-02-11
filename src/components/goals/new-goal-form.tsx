"use client";

import { motion } from "framer-motion";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useCallback } from "react";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { useValidatedForm } from "~/hooks/use-validated-form";
import { cn } from "~/lib/utils";

export const NewGoalFormValues = z.object({
  text: z.string().min(1, "Please enter a goal"),
});
export type NewGoalFormValues = z.infer<typeof NewGoalFormValues>;

export type NewGoalFormProps = {
  onSubmit: (values: NewGoalFormValues) => void | Promise<void>;
  placeholder?: string;
};

export function NewGoalForm({
  onSubmit,
  placeholder = "Set a new goal...",
}: NewGoalFormProps) {
  const form = useValidatedForm(NewGoalFormValues, {
    defaultValues: {
      text: "",
    },
  });

  const handleSubmit = useCallback(
    async (values: NewGoalFormValues) => {
      await onSubmit(values);
      form.reset();
    },
    [form, onSubmit],
  );

  const isSubmitting = form.formState.isSubmitting;
  const textError = form.formState.errors.text;

  return (
    <Form {...form}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl border bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ring-1 backdrop-blur-sm transition-all duration-300 hover:shadow-xl",
            textError
              ? "border-destructive/50 ring-destructive/5 focus-within:border-destructive focus-within:ring-destructive/30 hover:ring-destructive/10"
              : "border-primary/50 ring-primary/5 focus-within:border-primary focus-within:ring-primary/30 hover:ring-primary/10",
          )}
        >
          <motion.div
            initial={false}
            animate={{ scale: isSubmitting ? 0.97 : 1 }}
            className="flex w-full items-center gap-3"
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                textError
                  ? "bg-destructive/10 text-destructive group-focus-within:bg-destructive/20"
                  : "bg-primary/10 text-primary group-focus-within:bg-primary/20 group-focus-within:text-primary",
              )}
            >
              {isSubmitting ? (
                <Loader2Icon className="h-5 w-5 animate-spin" />
              ) : (
                <PlusIcon className="h-5 w-5" />
              )}
            </div>

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={textError?.message ?? placeholder}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full border-none bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0",
                        textError
                          ? "placeholder:text-destructive/60 focus-visible:placeholder:text-destructive"
                          : "placeholder:text-muted-foreground/60 focus-visible:placeholder:text-primary",
                      )}
                      onKeyDown={(e) => {
                        const shouldSubmit =
                          e.key === "Enter" &&
                          !isSubmitting &&
                          field.value.trim();

                        if (shouldSubmit) {
                          e.preventDefault();
                          void form.handleSubmit(handleSubmit)();
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </motion.div>
        </form>
      </motion.div>
    </Form>
  );
}
