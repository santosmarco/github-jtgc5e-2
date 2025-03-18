/**
 * Centralized analytics module for PostHog tracking
 * Contains typed utilities for identifying users, tracking events, and handling errors
 */

import posthog from "posthog-js";

/**
 * Event types for improved type safety
 */
export const EventName = {
  // User actions
  BUTTON_CLICK: "button_clicked",
  FORM_SUBMIT: "form_submitted",
  FORM_VALIDATION_ERROR: "form_validation_error",
  FEATURE_USED: "feature_used",

  // System events
  ERROR_OCCURRED: "error_occurred",
  PERFORMANCE_METRIC: "performance_metric",

  // Conversion events
  CONVERSION_SIGNUP: "conversion_signup",
  CONVERSION_UPGRADE: "conversion_upgrade",
  CONVERSION_INVITE_SENT: "conversion_invite_sent",
  CONVERSION_GOAL_COMPLETED: "conversion_goal_completed",
} as const;

/**
 * Type for user properties
 */
export type UserProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Type for event properties
 */
export type EventProperties = Record<
  string,
  string | number | boolean | null | undefined | string[]
>;

/**
 * Identify a user in PostHog with their properties
 * @param userId The unique ID of the user
 * @param userProperties Additional properties to associate with the user
 */
export function identifyUser(
  userId: string,
  userProperties: UserProperties = {},
): void {
  if (!userId) return;

  try {
    posthog.identify(userId, {
      ...userProperties,
      last_identified: new Date().toISOString(),
    });

    console.log("User identified in PostHog:", userId);
  } catch (error) {
    console.error("Error identifying user:", error);
  }
}

/**
 * Group users by team/organization for more meaningful analytics
 * @param groupType The type of group (e.g., "team", "organization")
 * @param groupId The unique ID of the group
 * @param groupProperties Additional properties to associate with the group
 */
export function identifyGroup(
  groupType: string,
  groupId: string,
  groupProperties: UserProperties = {},
): void {
  if (!groupId || !groupType) return;

  try {
    posthog.group(groupType, groupId, {
      ...groupProperties,
      last_identified: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error identifying group:", error);
  }
}

/**
 * Track any user action or event
 * @param eventName The name of the event to track
 * @param properties Additional properties associated with the event
 */
export function trackEvent(
  eventName: string,
  properties: EventProperties = {},
): void {
  try {
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error tracking event ${eventName}:`, error);
  }
}

/**
 * Track button click events with standardized properties
 * @param buttonName Identifier for the button
 * @param properties Additional properties associated with the click
 */
export function trackButtonClick(
  buttonName: string,
  properties: EventProperties = {},
): void {
  trackEvent(EventName.BUTTON_CLICK, {
    button_name: buttonName,
    ...properties,
  });
}

/**
 * Track form submission events
 * @param formName Identifier for the form
 * @param properties Additional properties associated with the form submission
 */
export function trackFormSubmit(
  formName: string,
  properties: EventProperties = {},
): void {
  trackEvent(EventName.FORM_SUBMIT, {
    form_name: formName,
    ...properties,
  });
}

/**
 * Track form validation errors
 * @param formName Identifier for the form
 * @param errorDetails Details about the validation errors
 */
export function trackFormError(
  formName: string,
  errorDetails: EventProperties = {},
): void {
  trackEvent(EventName.FORM_VALIDATION_ERROR, {
    form_name: formName,
    ...errorDetails,
  });
}

/**
 * Track feature usage
 * @param featureName Identifier for the feature
 * @param properties Additional properties about feature usage
 */
export function trackFeatureUsed(
  featureName: string,
  properties: EventProperties = {},
): void {
  trackEvent(EventName.FEATURE_USED, {
    feature_name: featureName,
    ...properties,
  });
}

/**
 * Track errors and exceptions for monitoring
 * @param errorMessage The error message
 * @param errorDetails Additional details about the error
 */
export function trackError(
  errorMessage: string,
  errorDetails: EventProperties = {},
): void {
  trackEvent(EventName.ERROR_OCCURRED, {
    error_message: errorMessage,
    ...errorDetails,
  });
}

/**
 * Track conversion events with optional monetary value
 * @param conversionName Type of conversion event
 * @param value Optional monetary value associated with the conversion
 * @param properties Additional properties about the conversion
 */
export function trackConversion(
  conversionName: string,
  value?: number,
  properties: EventProperties = {},
): void {
  trackEvent(`conversion_${conversionName}`, {
    value,
    ...properties,
  });
}

/**
 * Track performance metrics for monitoring user experience
 * @param metricName Name of the performance metric
 * @param value Value of the metric
 * @param properties Additional properties about the metric
 */
export function trackPerformanceMetric(
  metricName: string,
  value: number,
  properties: EventProperties = {},
): void {
  trackEvent(EventName.PERFORMANCE_METRIC, {
    metric_name: metricName,
    value,
    ...properties,
  });
}

/**
 * Check if the current user has opted out of tracking
 */
export function hasUserOptedOut(): boolean {
  try {
    return posthog.has_opted_out_capturing();
  } catch {
    return true;
  }
}

/**
 * Opt a user out of tracking (GDPR compliance)
 */
export function optUserOut(): void {
  try {
    posthog.opt_out_capturing();
  } catch (error) {
    console.error("Error opting user out:", error);
  }
}

/**
 * Opt a user back into tracking
 */
export function optUserIn(): void {
  try {
    posthog.opt_in_capturing();
  } catch (error) {
    console.error("Error opting user in:", error);
  }
}

/**
 * Reset the current user's identity (for logout)
 */
export function resetUser(): void {
  try {
    posthog.reset();
  } catch (error) {
    console.error("Error resetting user:", error);
  }
}
