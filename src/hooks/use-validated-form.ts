import { zodResolver } from "@hookform/resolvers/zod";
import type { UseFormProps } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { Except, SetRequired } from "type-fest";
import type { z } from "zod";

export type UseValidatedFormProps<T extends z.ZodTypeAny> = SetRequired<
  Except<UseFormProps<z.input<T>, undefined>, "resolver">,
  "defaultValues"
>;

export function useValidatedForm<T extends z.ZodTypeAny>(
  schema: T,
  props: UseValidatedFormProps<T>,
) {
  return useForm<z.infer<T>>({
    ...props,
    resolver: zodResolver(schema),
  });
}

export type UseValidatedFormReturn<T extends z.ZodTypeAny> = ReturnType<
  typeof useValidatedForm<T>
>;
