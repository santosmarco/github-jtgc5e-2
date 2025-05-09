import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import type { Falsey } from "lodash";
import { twMerge } from "tailwind-merge";
import type { Tagged } from "type-fest";

import { env } from "~/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isTruthy<T>(value: T): value is Exclude<T, Falsey> {
  return Boolean(value);
}

type BackoffOptions = {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
};

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  options: BackoffOptions,
): Promise<T> {
  let attempt = 0;
  let delay = options.initialDelay;

  while (attempt < options.maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt === options.maxAttempts) throw error;

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * 2, options.maxDelay);

      // Add some jitter
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw new Error("Max attempts reached");
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  initialDelay?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const {
    timeout = 10000, // 10 second default timeout
    retries = 3,
    initialDelay = 1000,
    ...fetchOptions
  } = options;

  // Skip timeout and retries in development environment
  if (env.NODE_ENV === "development") {
    return fetch(url, fetchOptions);
  }

  return exponentialBackoff(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    {
      maxAttempts: retries,
      initialDelay,
      maxDelay: 10000, // 10 second max delay between retries
    },
  );
}

export function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return new Date(dateString).toLocaleDateString(undefined, options);
}

export function isKeyOf<T extends object>(
  key: string,
  obj: T,
): key is Extract<keyof T, string> {
  return key in obj;
}

export function tag<T, TTag extends string>(
  value: T,
  _tag: TTag,
): Tagged<T, TTag> {
  return value as Tagged<T, TTag>;
}
