import type { UseTRPCQueryResult } from "@trpc/react-query/shared";
import { useEffect, useMemo, useState } from "react";

export type TabDataState<TData, TError> = UseTRPCQueryResult<TData, TError> & {
  isEmpty: boolean;
  loadingMessage: string;
  emptyMessage: string;
  errorMessage: string;
};

export function useTabData<TData, TError>(
  queryResult: UseTRPCQueryResult<TData, TError>,
  options: {
    isEmpty?: (data: typeof queryResult.data) => boolean;
    defaultEmptyMessage?: string;
    defaultLoadingMessage?: string;
    defaultErrorMessage?: string;
  } = {},
): TabDataState<TData, TError> {
  const { data, isLoading, isError } = queryResult;

  const [isEmpty, setIsEmpty] = useState(false);

  const checkIsEmpty = useMemo<NonNullable<typeof options.isEmpty>>(
    () =>
      options.isEmpty ??
      ((data) => {
        if (data === null || data === undefined) return true;
        if (Array.isArray(data)) return data.length === 0;
        if (typeof data === "object" && data !== null)
          return Object.keys(data).length === 0;
        return !data;
      }),
    [options.isEmpty],
  );

  useEffect(() => {
    if (!isLoading && !isError && data !== undefined) {
      setIsEmpty(checkIsEmpty(data));
    }
  }, [isLoading, isError, data, checkIsEmpty]);

  return {
    ...queryResult,
    isEmpty,
    loadingMessage: options?.defaultLoadingMessage ?? "Loading content...",
    emptyMessage: options?.defaultEmptyMessage ?? "No content available",
    errorMessage: options?.defaultErrorMessage ?? "Failed to load content",
  };
}
