// src/index.ts
import { serve } from "bun";
import { convertEmailToZip } from "./converter";
import "dotenv/config";
import { loadCdogsTemplate } from "./cdogs";

await loadCdogsTemplate();

const PORT = Number(process.env.PORT) || 3000;

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (url.pathname !== "/convert/email" || req.method !== "POST") {
    return new Response("POST /convert/email only", { status: 404 });
  }

  let formData: FormData;
  try {
    // @ts-expect-error Bun + TS known warning
    formData = await req.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid multipart/form-data" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const file = formData.get("file") as File | null;
  const outputFormat =
    (formData.get("outputFormat") as string | null)?.toLowerCase() ?? "both";
  const renderer =
    (formData.get("renderer") as "cdogs" | "carbone" | null) ?? "carbone";

  if (!file) {
    return new Response(JSON.stringify({ error: "Missing file" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (file.size > 25 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: "File too large (>25 MB)" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const zipBuffer = await convertEmailToZip(
      file,
      outputFormat as any,
      renderer,
    );

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.T]/g, "-")
      .slice(0, 19);

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="email_export_${timestamp}.zip"`,
        ...corsHeaders
      },
    });
  } catch (err: any) {
    console.error("Conversion failed:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Conversion failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

if (import.meta.main) {
  const server = serve({
    port: PORT,
    fetch: handleRequest,
  });

  console.log(
    `Email to PDF/HTML/ZIP service running on http://localhost:${PORT}`,
  );

  const shutdown = () => {
    console.log("\nShutting down server...");
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
