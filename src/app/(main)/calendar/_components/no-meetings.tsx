import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export function NoMeetings(): JSX.Element {
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
        <h3 className="text-xl font-medium">No upcoming meetings</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          You don&apos;t have any meetings scheduled. Add a meeting link above
          to record your next meeting, or connect your calendar to see upcoming
          events.
        </p>
      </motion.div>

      {/* Information Message */}
      {/* <div className="mt-8 flex items-start gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <p>
            You can connect your calendar to automatically sync upcoming
            meetings.
          </p>
          <a
            href="/settings/integrations"
            className="mt-1 inline-block text-primary hover:underline"
          >
            Connect calendar
          </a>
        </div>
      </div> */}
    </div>
  );
}
