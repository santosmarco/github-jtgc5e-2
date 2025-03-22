"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

import titanLogo from "~/assets/titan-logo.svg";
import { Alert, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Link } from "~/components/ui/link";
import { logger } from "~/lib/logging/client";
import { api } from "~/trpc/react";

import { SignInButton } from "./_components/sign-in-button";

export default function SignInPage() {
  const searchParams = useSearchParams();

  const reason = searchParams.get("reason");
  const email = searchParams.get("email");
  const invite = searchParams.get("invite");
  const role = z
    .enum(["user", "coach"])
    .nullish()
    .catch("user")
    .parse(searchParams.get("role"));

  const { mutate: resendInvitation } =
    api.userInvites.resendInvitation.useMutation({
      onSuccess: () => {
        toast.success("Invitation resent", {
          description: "Check your email for a new invitation link.",
        });
      },
      onError: (err) => {
        logger.error("Failed to resend invitation", { error: err });
        toast.error("Failed to resend invitation", {
          description: "Please try again later.",
        });
      },
    });

  const handleResendInvitation = () => {
    if (!email) return;
    resendInvitation({ email, role: role ?? "user" });
  };

  useEffect(() => {
    localStorage.removeItem("profile");
  }, []);

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

      {/* Login container */}
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
              Welcome to Titan
            </motion.h1>
            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-2 text-sm text-muted-foreground"
            >
              Sign in to continue to your account
            </motion.p>
          </motion.div>

          {reason === "forbidden" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Alert variant="destructive" className="bg-destructive/5">
                <AlertTitle className="mb-0 flex items-center justify-center gap-2 font-medium leading-normal text-destructive">
                  Sign up is currently invite-only.
                </AlertTitle>
              </Alert>
            </motion.div>
          )}

          {reason === "invitation-expired" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Alert variant="default">
                <AlertTitle className="mb-0 flex items-center justify-center gap-2 font-medium leading-normal">
                  Your invitation has expired.
                  {email && (
                    <>
                      {" "}
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={handleResendInvitation}
                      >
                        Request a new one.
                      </Button>
                    </>
                  )}
                </AlertTitle>
              </Alert>
            </motion.div>
          )}

          {reason === "inactive" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Alert variant="default">
                <AlertTitle className="mb-0 flex items-center justify-center gap-2 font-medium leading-normal">
                  Your account is inactive. Contact your coach for more
                  information.
                </AlertTitle>
              </Alert>
            </motion.div>
          )}

          <SignInButton inviteId={invite} hidden={!!reason} />

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
