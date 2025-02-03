"use client";

import { motion } from "framer-motion";
import { GoalIcon, Loader2Icon, Sparkles } from "lucide-react";
import { useCallback } from "react";
import { z } from "zod";

import {
  useValidatedForm,
  type UseValidatedFormReturn,
} from "~/hooks/use-validated-form";

import { Form, FormControl, FormField, FormItem } from "../ui/form";
import { Input } from "../ui/input";

const formSchema = z.object({
  text: z.string().min(1, "Please enter a goal"),
});

type NewGoalFormProps = {
  onSubmit: (
    ...props: Parameters<
      Parameters<UseValidatedFormReturn<typeof formSchema>["handleSubmit"]>[0]
    >
  ) => void | Promise<void>;
};

export function NewGoalForm({ onSubmit }: NewGoalFormProps) {
  const form = useValidatedForm(formSchema, {
    defaultValues: {
      text: "",
    },
  });

  const handleSubmit = useCallback<Parameters<typeof form.handleSubmit>[0]>(
    async (...props) => {
      await onSubmit(...props);
      form.reset();
    },
    [form, onSubmit],
  );

  return (
    <Form {...form}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="group relative -mx-10 flex items-center gap-3 rounded-xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ring-1 ring-primary/5 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:ring-primary/10"
        >
          <motion.div
            initial={false}
            animate={{ scale: form.formState.isSubmitting ? 0.97 : 1 }}
            className="flex w-full items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {form.formState.isSubmitting ? (
                <Loader2Icon className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
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
                      placeholder={
                        form.formState.errors.text
                          ? form.formState.errors.text.message
                          : "What's your next step? Click to add goal..."
                      }
                      disabled={form.formState.isSubmitting}
                      className={`border-none bg-transparent p-0 text-base font-medium shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 ${form.formState.errors.text ? "placeholder:text-destructive" : ""}`}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !form.formState.isSubmitting &&
                          field.value.trim()
                        ) {
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
