"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  LockIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { useProfile } from "~/hooks/use-profile";
import { checkUserFlags, Flag } from "~/lib/flags/flags";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

import { Textarea } from "../ui/textarea";

const profileFormSchema = z.object({
  nickname: z.string().min(1, "Name is required"),
  image_url: z.string().url("Invalid URL").or(z.literal("")),
  dossier: z.string(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  user: RouterOutputs["auth"]["getUser"];
  profileEnhancements: Tables<"profile_enhancements"> | null;
  onUpdate?: () => void;
}

// Animation variants
const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.03 },
  tap: { scale: 0.97 },
};

const disabledOverlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const disabledContentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      delay: 0.2,
    },
  },
};

export function ProfileForm({
  user,
  profileEnhancements,
  onUpdate,
}: ProfileFormProps) {
  const { profile } = useProfile();
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);

  const canEdit = checkUserFlags(user, [Flag.ALLOW_PROFILE_EDIT]);

  const utils = api.useUtils();

  const updateProfile = api.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      void utils.profile.getProfileEnhancements.invalidate();
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description: error.message,
      });
    },
  });

  const generateDevelopmentThemes =
    api.profile.generateDevelopmentThemes.useMutation({
      onSuccess: () => {
        setIsGeneratingThemes(false);
        toast.success("Development themes generated successfully!");
        void utils.profile.getProfileDevelopmentThemes.invalidate();
      },
      onError: (error) => {
        setIsGeneratingThemes(false);
        toast.error("Failed to generate development themes", {
          description: error.message,
        });
      },
    });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      nickname: profile?.nickname || "",
      image_url: profile?.image_url || "",
      dossier: profileEnhancements?.dossier || "",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile?.id) return;

    // Update profile
    await updateProfile.mutateAsync({
      profileId: profile.id,
      nickname: values.nickname,
      image_url: values.image_url,
      dossier: values.dossier,
    });

    // Generate development themes if dossier was provided and has content
    if (values.dossier && values.dossier.trim().length > 0) {
      setIsGeneratingThemes(true);
      await generateDevelopmentThemes.mutateAsync({
        profileId: profile.id,
        dossier: values.dossier,
      });
    }
  };

  const isSubmitting = updateProfile.isPending || isGeneratingThemes;

  return (
    <Form {...form}>
      <div className="relative">
        <motion.form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "space-y-6",
            !canEdit && "pointer-events-none blur-sm filter",
          )}
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                      }}
                      className="rounded-full bg-primary/10 p-1"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-primary" />
                    </motion.div>
                    Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your name"
                      {...field}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                        delay: 0.1,
                      }}
                      className="rounded-full bg-primary/10 p-1"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    </motion.div>
                    Profile Image URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="dossier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                        delay: 0.2,
                      }}
                      className="rounded-full bg-primary/10 p-1"
                    >
                      <FileTextIcon className="h-3.5 w-3.5 text-primary" />
                    </motion.div>
                    About Me
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself, your skills, experiences, strengths, and areas for improvement..."
                      className="min-h-32 resize-y transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                  <motion.p
                    className="text-xs text-muted-foreground"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    This information will be used to generate development themes
                    that highlight your key traits and areas for professional
                    growth.
                  </motion.p>
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={itemVariants} whileHover="hover" whileTap="tap">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "relative ml-auto overflow-hidden transition-all duration-300",
                isSubmitting && "bg-primary/90",
              )}
            >
              {isSubmitting && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="mr-2 flex items-center"
                >
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                </motion.div>
              )}
              <motion.span
                key={isGeneratingThemes ? "generating" : "saving"}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isGeneratingThemes
                  ? "Generating Development Themes..."
                  : "Save Profile"}
              </motion.span>
            </Button>
          </motion.div>
        </motion.form>

        {!canEdit && (
          <AnimatePresence>
            <motion.div
              className="absolute inset-0 -mx-6 -mb-6 flex items-center justify-center rounded-xl rounded-t-none bg-background/80 backdrop-blur-sm"
              variants={disabledOverlayVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                className="flex flex-col items-center justify-center space-y-4 px-6 py-8 text-center"
                variants={disabledContentVariants}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.3,
                  }}
                  className="rounded-full bg-primary/10 p-4"
                >
                  <LockIcon className="h-8 w-8 text-primary" />
                </motion.div>
                <motion.h3
                  className="text-xl font-semibold text-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Profile Editing Unavailable
                </motion.h3>
                <motion.p
                  className="max-w-md text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Editing profile is currently not supported. This feature will
                  be available soon.
                </motion.p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Form>
  );
}
