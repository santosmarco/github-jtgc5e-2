import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

export function register() {
  registerOTel({
    serviceName: "titan-frontend",
    traceExporter: new LangfuseExporter({ debug: true }),
  });
}
