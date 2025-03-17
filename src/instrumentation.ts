import { registerOTel } from "@vercel/otel";

export async function register() {
  const { LangfuseExporter } = await import("langfuse-vercel");

  registerOTel({
    serviceName: "langfuse-vercel-ai-nextjs-example",
    traceExporter: new LangfuseExporter(),
  });
}
