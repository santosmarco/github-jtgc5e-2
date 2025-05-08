import type { Select, Tagged } from "~/lib/utils/types";

export function shouldShowMoment<
  T extends Select<"moments", "latest" | "relevant" | "_internal_thumbs_down">,
>(moment: T): moment is Tagged<T, "shouldShowMoment"> {
  return moment.latest && moment.relevant && moment._internal_thumbs_down <= 0;
}
