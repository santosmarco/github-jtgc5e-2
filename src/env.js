import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const runtime = "nodejs";

export const env = createEnv({
  server: {
    // Node.js
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // API
    API_KEY: z.string(),
    // Vercel
    VERCEL_URL: z.string().optional(),
    SITE_URL: z.string().optional(),
    // Internal API Key
    INTERNAL_API_URL: z.string(),
    INTERNAL_API_KEY: z.string(),
    // Trigger
    TRIGGER_API_URL: z.string(),
    TRIGGER_SECRET_KEY: z.string(),
    // OAuth
    GOOGLE_OAUTH_CLIENT_ID: z.string(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string(),
    // OpenAI
    OPENAI_API_KEY: z.string(),
    // API Video
    API_VIDEO_BASE_URI: z.string(),
    API_VIDEO_API_KEY: z.string(),
    // Meeting Baas
    MEETING_BAAS_API_KEY: z.string(),
    // Slack
    SLACK_BOT_TOKEN: z.string(),
    SLACK_NOTIFICATIONS_CHANNEL: z.string().default("eng-alerts-dev"),
    SLACK_FEEDBACKS_CHANNEL: z.string().default("feedback-alerts-dev"),
    LOGTAIL_SOURCE_TOKEN: z.string(),
    // Langfuse
    LANGFUSE_BASEURL: z.string(),
    LANGFUSE_PUBLIC_KEY: z.string(),
    LANGFUSE_SECRET_KEY: z.string(),
    // Pinecone
    PINECONE_API_KEY: z.string(),
    PINECONE_HOST: z.string(),
    PINECONE_INDEX: z.string(),
    // Resend
    RESEND_API_KEY: z.string(),
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    RECALL_BASE_URL: z.string().min(1).url(),
    RECALL_API_KEY: z.string().min(1),
  },

  client: {
    // Node.js
    NEXT_PUBLIC_NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Vercel
    NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z
      .string()
      .url()
      .optional()
      .refine((url) => !url?.endsWith("/"), "Must not end with a slash"),
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  },

  runtimeEnv: {
    // Server
    NODE_ENV: process.env.NODE_ENV,
    API_KEY: process.env.API_KEY,
    VERCEL_URL: process.env.VERCEL_URL,
    SITE_URL: process.env.SITE_URL,
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
    TRIGGER_API_URL: process.env.TRIGGER_API_URL,
    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    API_VIDEO_BASE_URI: process.env.API_VIDEO_BASE_URI,
    API_VIDEO_API_KEY: process.env.API_VIDEO_API_KEY,
    MEETING_BAAS_API_KEY: process.env.MEETING_BAAS_API_KEY,
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_NOTIFICATIONS_CHANNEL: process.env.SLACK_NOTIFICATIONS_CHANNEL,
    SLACK_FEEDBACKS_CHANNEL: process.env.SLACK_FEEDBACKS_CHANNEL,
    LOGTAIL_SOURCE_TOKEN: process.env.LOGTAIL_SOURCE_TOKEN,
    LANGFUSE_BASEURL: process.env.LANGFUSE_BASEURL,
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_HOST: process.env.PINECONE_HOST,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    // Resend
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    // Client
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RECALL_BASE_URL: process.env.RECALL_BASE_URL,
    RECALL_API_KEY: process.env.RECALL_API_KEY,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  emptyStringAsUndefined: true,
});
