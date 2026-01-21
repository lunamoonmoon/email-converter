// src/cdogs.ts
import axios from "axios";
import fs from "fs/promises";
import path from "path";

export const CDOGS_AUTH_URL = `${process.env.CDOGS_AUTH_URL}/auth/realms/comsvcauth/protocol/openid-connect/token`;

export const CDOGS_SERVICE_URL = `${process.env.CDOGS_SERVICE_URL}/api/v2/template/render`;

export const CLIENT_ID = process.env.CDOGS_CLIENT_ID;
export const CLIENT_SECRET = process.env.CDOGS_CLIENT_SECRET;
export const CDOGS_ENABLED =
  process.env.CDOGS_ENABLED?.toLowerCase() === "true";

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error(
    "Missing CDOGS_CLIENT_ID or CDOGS_CLIENT_SECRET in environment",
  );
}

let base64Template: string;

// Load template once at startup (called from index.ts)
export async function loadCdogsTemplate(
  templatePath = "./templates/email-template.html",
) {
  try {
    const fullPath = path.resolve(templatePath);
    const templateBuffer = await fs.readFile(fullPath);
    base64Template = templateBuffer.toString("base64");
    console.log(
      `CDOGS template loaded (${templateBuffer.length} bytes) from ${fullPath}`,
    );
  } catch (err) {
    console.error("Failed to load CDOGS template:", err);
    throw err;
  }
}

const templatePayload = {
  encodingType: "base64",
  fileType: "html",
  content: "", // filled after load
};

const defaultOptions = {
  cacheReport: false,
  overwrite: true,
  reportName: "email-output.pdf",
};

// ────────────────────────────────────────────────────────────────
// Get bearer token (Basic Auth – same as your other app)
// ────────────────────────────────────────────────────────────────
export async function getBearerToken(): Promise<string> {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
    "base64",
  );

  try {
    const response = await axios.post(
      CDOGS_AUTH_URL,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return response.data.access_token;
  } catch (error: any) {
    console.error(
      "CDOGS token request failed:",
      error.response?.data || error.message,
    );
    throw new Error(`Failed to get CDOGS token: ${error.message}`);
  }
}

// ────────────────────────────────────────────────────────────────
// Render document via CDOGS (supports pdf and html)
// ────────────────────────────────────────────────────────────────
export async function renderWithCdogs(
  data: unknown,
  format: "pdf" | "html" = "pdf",
): Promise<Uint8Array> {
  if (!CDOGS_ENABLED) {
    throw new Error("CDOGS is disabled via environment variable");
  }

  if (!base64Template) {
    throw new Error(
      "CDOGS template not loaded. Call loadCdogsTemplate() first.",
    );
  }

  const payload = {
    data,
    format,
    template: {
      ...templatePayload,
      content: base64Template,
    },
    options: {
      ...defaultOptions,
      convertTo: format,
      reportName: `email-output.${format}`,
    },
  };

  try {
    const response = await axios.post(CDOGS_SERVICE_URL, payload, {
      headers: {
        Authorization: `Bearer ${await getBearerToken()}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 30000,
    });

    return new Uint8Array(response.data);
  } catch (error: any) {
    console.error(
      "CDOGS render failed:",
      error.response?.data || error.message,
    );
    throw new Error(`CDOGS render failed: ${error.message}`);
  }
}
