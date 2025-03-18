"use client";

import { useCallback } from "react";
import {
  EventName,
  type EventProperties,
  type UserProperties,
  identifyUser,
  identifyGroup,
  trackEvent,
  trackButtonClick,
  trackFormSubmit,
  trackFormError,
  trackFeatureUsed,
  trackError,
  trackConversion,
  trackPerformanceMetric,
  resetUser,
} from "~/lib/analytics";

/**
 * Custom hook for PostHog analytics in React components
 * Returns memoized functions to prevent unnecessary re-renders
 */
export function useAnalytics() {
  // User identification
  const identify = useCallback(
    (userId: string, properties: UserProperties = {}) => {
      identifyUser(userId, properties);
    },
    [],
  );

  const identifyTeam = useCallback(
    (teamId: string, properties: UserProperties = {}) => {
      identifyGroup("team", teamId, properties);
    },
    [],
  );

  // General event tracking
  const track = useCallback(
    (eventName: string, properties: EventProperties = {}) => {
      trackEvent(eventName, properties);
    },
    [],
  );

  // Specialized tracking functions
  const trackButton = useCallback(
    (buttonName: string, properties: EventProperties = {}) => {
      trackButtonClick(buttonName, properties);
    },
    [],
  );

  const trackForm = useCallback(
    (formName: string, properties: EventProperties = {}) => {
      trackFormSubmit(formName, properties);
    },
    [],
  );

  const trackFormValidationError = useCallback(
    (formName: string, errorDetails: EventProperties = {}) => {
      trackFormError(formName, errorDetails);
    },
    [],
  );

  const trackFeature = useCallback(
    (featureName: string, properties: EventProperties = {}) => {
      trackFeatureUsed(featureName, properties);
    },
    [],
  );

  const trackException = useCallback(
    (errorMessage: string, errorDetails: EventProperties = {}) => {
      trackError(errorMessage, errorDetails);
    },
    [],
  );

  const trackRevenueEvent = useCallback(
    (eventName: string, value?: number, properties: EventProperties = {}) => {
      trackConversion(eventName, value, properties);
    },
    [],
  );

  const trackMetric = useCallback(
    (metricName: string, value: number, properties: EventProperties = {}) => {
      trackPerformanceMetric(metricName, value, properties);
    },
    [],
  );

  const resetUserIdentity = useCallback(() => {
    resetUser();
  }, []);

  return {
    // User/group identification
    identify,
    identifyTeam,
    resetUserIdentity,

    // General tracking
    track,

    // Specialized tracking
    trackButton,
    trackForm,
    trackFormValidationError,
    trackFeature,
    trackException,
    trackRevenueEvent,
    trackMetric,

    // Event name constants
    EventName,
  };
}
