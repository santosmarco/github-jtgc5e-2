"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";
import { z } from "zod";

import titanLogo from "~/assets/titan-logo.svg";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Link } from "~/components/ui/link";
import { useValidatedForm } from "~/hooks/use-validated-form";
import { api } from "~/trpc/react";

const inviteFormSchema = z.object({
  clientId: z.string().min(1, "Zoom app client ID is required"),
  email: z.string().email("Please enter a valid email address"),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export default function ZoomReviewerInvitePage() {
  const form = useValidatedForm(inviteFormSchema, {
    defaultValues: {
      email: "",
      clientId: "",
    },
  });

  const { mutate: sendInvite, isPending: isLoading } =
    api.auth.handleZoomReviewerInvite.useMutation({
      onSuccess: () => {
        toast.success("Invitation sent", {
          description: "You will receive an email with instructions.",
        });
        form.reset();
      },
      onError: (error) => {
        toast.error("Failed to send invitation", {
          description: error.message || "Please try again later.",
        });
      },
    });

  const onSubmit = (values: InviteFormValues) => {
    sendInvite({ clientId: values.clientId, email: values.email });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-accent/30 to-primary/20">
      {/* Animated background elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute -left-4 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      </motion.div>

      {/* Form container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative isolate z-10 w-full max-w-md rounded-2xl border border-border/50 bg-background/20 p-8 shadow-xl ring-1 ring-ring/5 backdrop-blur-xl"
      >
        <div className="space-y-6">
          {/* Logo and title */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mx-auto mb-2 flex h-12 w-12 items-center justify-center"
            >
              <Image src={titanLogo} alt="Titan Logo" width={48} height={48} />
            </motion.div>
            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-2xl font-bold tracking-tight"
            >
              Zoom Reviewer Sign In
            </motion.h1>
            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-2 text-sm text-muted-foreground"
            >
              Enter the information below to continue. You'll receive an email
              with instructions on how to sign in.
            </motion.p>
          </motion.div>

          {/* Email form */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zoom app client ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Zoom app client ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>

          {/* Terms */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center text-sm text-muted-foreground"
          >
            By continuing, you agree to our
            <br />
            <Link
              href="https://www.withtitan.com/legal/client-terms-of-service"
              target="_blank"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="https://www.withtitan.com/legal/privacy-policy"
              target="_blank"
            >
              Privacy Policy
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
