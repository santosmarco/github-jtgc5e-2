import axios, { type AxiosError } from "axios";
// import axiosRetry from "axios-retry";

import { env } from "~/env";

export const client = axios.create({
  baseURL: env.INTERNAL_API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": env.INTERNAL_API_KEY,
  },
});

/*
// Configure retry behavior
axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) >= 500
    );
  },
});
*/

// Add request interceptor
client.interceptors.request.use(
  (config) => {
    console.log("Request:", {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: config.headers,
    });
    return config;
  },
  (error: AxiosError) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor
client.interceptors.response.use(
  (response) => {
    console.log("Response:", {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error: AxiosError) => {
    console.error("Response error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    /*
    // If there's a fallback URL available, try the request again with it
    if (env.INTERNAL_API_URL_OLD && error.config) {
      console.log("Retrying with fallback API URL:", env.INTERNAL_API_URL_OLD);
      const fallbackConfig = { ...error.config };
      fallbackConfig.baseURL = env.INTERNAL_API_URL_OLD;

      return axios(fallbackConfig);
    }
    */

    return Promise.reject(error);
  },
);
