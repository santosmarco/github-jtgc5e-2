import dayjs from "dayjs";
import _ from "lodash";

import { shouldShowMoment } from "~/lib/moments/utils";
import type { Intersect, Select, Tagged } from "~/lib/utils/types";

export function shouldShowReportMoment<
  T extends Intersect<
    Select<"report_moments", "is_visible" | "omission_reason">,
    {
      moment: Parameters<typeof shouldShowMoment>[0];
    }
  >,
>(
  reportMoment: T,
): reportMoment is Tagged<
  T & {
    moment: ReturnType<typeof shouldShowMoment<typeof reportMoment.moment>>;
  },
  "shouldShowReportMoment"
> {
  return (
    reportMoment.is_visible &&
    !reportMoment.omission_reason &&
    shouldShowMoment(reportMoment.moment)
  );
}

export function shouldShowReport(
  report: Intersect<
    Select<"reports", "is_hidden">,
    {
      report_moments: Parameters<typeof shouldShowReportMoment>[0][];
    }
  >,
) {
  return (
    !report.is_hidden && report.report_moments.some(shouldShowReportMoment)
  );
}

export function dedupeReports<
  T extends Select<"reports", "start_date" | "end_date" | "created_at">,
>(reports: T[]): T[] {
  if (!reports.length) return [];

  const map = new Map<string, T>();

  for (const report of reports) {
    const periodKey = `${dayjs(report.start_date).format("YYYY-MM-DD")}_${dayjs(report.end_date).format("YYYY-MM-DD")}`;
    const currentReportOnKey = map.get(periodKey);

    if (
      !currentReportOnKey ||
      dayjs(report.created_at).isAfter(dayjs(currentReportOnKey.created_at))
    ) {
      map.set(periodKey, report);
    }
  }

  const deduped = Array.from(map.values());

  return _.orderBy(
    deduped,
    [
      (report) => dayjs(dayjs(report.start_date).format("YYYY-MM-DD")).unix(),
      (report) => dayjs(dayjs(report.end_date).format("YYYY-MM-DD")).unix(),
      (report) => dayjs(report.created_at).unix(),
    ],
    ["asc", "asc", "asc"],
  );
}
