import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export type NoMeetingsProps = {
  isPastDate: boolean;
};

export function NoMeetings({ isPastDate }: NoMeetingsProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      >
        <motion.div
          initial={{ rotate: -10, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-full bg-muted p-4"
        >
          <Calendar className="h-10 w-10 text-muted-foreground" />
        </motion.div>
        <h3 className="text-xl font-medium">
          {isPastDate ? "No meetings found" : "No upcoming meetings"}
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {isPastDate
            ? "There are no meetings recorded for this date."
            : "You don't have any meetings scheduled for this date."}
        </p>
      </motion.div>
    </div>
  );
}
