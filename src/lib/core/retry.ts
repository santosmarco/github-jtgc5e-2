/**
 * Configuration options for retry functionality
 */
export interface RetryConfig {
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Base delay between retries in ms (default: 300) */
  baseDelay?: number;
  /** Timeout in ms for each attempt (default: 5000) */
  timeout?: number;
  /** Whether to use exponential backoff (default: true) */
  useExponentialBackoff?: boolean;
  /** Optional callback for logging retry attempts */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends Error {
  constructor(timeout: number) {
    super(`Operation timed out after ${timeout}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Executes a function with configurable retry behavior
 *
 * @param fn The async function to execute with retry logic
 * @param config Configuration options for retries and timeouts
 * @returns Promise that resolves with the function result or rejects after all retries
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig,
): Promise<T> {
  const {
    retries = 3,
    baseDelay = 300,
    timeout = 5000,
    useExponentialBackoff = true,
    onRetry,
  } = config || {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(timeout));
        }, timeout);
      });

      // Race between the function and the timeout
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Call onRetry callback if provided
      if (onRetry && attempt < retries) {
        onRetry(attempt + 1, lastError);
      }

      // Don't wait on the last attempt
      if (attempt < retries) {
        // Calculate delay with or without exponential backoff
        const delay = useExponentialBackoff
          ? baseDelay * 2 ** attempt * (0.5 + Math.random() * 0.5) // Exponential with jitter
          : baseDelay * (0.5 + Math.random() * 0.5); // Fixed with jitter

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Operation failed after retries");
}
