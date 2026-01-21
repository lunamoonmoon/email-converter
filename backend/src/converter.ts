// src/converter.ts
import { simpleParser } from "mailparser";
import type { AddressObject, EmailAddress } from "mailparser";
import MsgReader from "@kenjiuno/msgreader";
import archiver from "archiver";
import { randomUUID } from "crypto";
import path from "path";
import { renderWithCdogs } from "./cdogs";

export type UnifiedEmailData = {
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  date: string | null;
  body: {
    html: string | null;
    text: string | null;
  };
  attachments: Array<{
    name: string;
    contentType?: string;
    size: number;
  }>;
};

/**
 * Extract email addresses from mailparser AddressObject field
 */
function getAddresses(
  field: AddressObject | AddressObject[] | null | undefined,
): string[] {
  if (!field) return [];
  const objects = Array.isArray(field) ? field : [field];
  return objects.flatMap((obj) => {
    if (!obj?.value) return [];
    const addrs = Array.isArray(obj.value) ? obj.value : [obj.value];
    return addrs.map((a: EmailAddress) => a.address ?? "").filter(Boolean);
  });
}

/**
 * Normalize parsed email data into a common shape for CDOGS template
 */
function normalizeEmailData(parsed: any, isEml: boolean): UnifiedEmailData {
  console.log("Normalizing email data for", isEml ? ".eml" : ".msg");
  if (isEml) {
    // mailparser (.eml)
    return {
      subject: parsed.subject || "(no subject)",
      from: parsed.from?.text || parsed.from?.value?.[0]?.address || "unknown",
      to: getAddresses(parsed.to),
      cc: getAddresses(parsed.cc),
      bcc: getAddresses(parsed.bcc),
      date: parsed.date?.toISOString() ?? null,
      body: {
        html: parsed.html ?? null,
        text: parsed.text ?? null,
      },
      attachments: parsed.attachments.map((att: any) => ({
        name: att.filename || `attachment_${randomUUID().slice(0, 8)}`,
        contentType: att.contentType,
        size: att.size,
      })),
    };
  }

  // @kenjiuno/msgreader (.msg)
  const msgData = parsed.getFileData ? parsed.getFileData() : parsed;

  const getRecipients = (type: string) =>
    (msgData.recipients || [])
      .filter((r: any) => r.recipType === type)
      .map((r: any) => r.email || r.name)
      .filter(Boolean);
  console.log(
    msgData.htmlBody
      ? new TextDecoder().decode(msgData.htmlBody)
      : msgData.body,
  );
  text: msgData.body;
  return {
    subject: msgData.subject || "(no subject)",
    from: msgData.senderEmail || msgData.senderName || "unknown",
    to: getRecipients("to"),
    cc: getRecipients("cc"),
    bcc: getRecipients("bcc"),
    date:
      msgData.messageDeliveryTime ||
      msgData.clientSubmitTime ||
      msgData.creationTime ||
      null,
    body: {
      html: msgData.htmlBody
        ? new TextDecoder().decode(msgData.htmlBody)
        : null,
      text: msgData.body || null,
    },
    attachments: (msgData.attachments || []).map((att: any) => ({
      name:
        att.fileName ||
        att.fileNameShort ||
        `attachment_${randomUUID().slice(0, 8)}`,
      contentType: att.attachMimeTag,
      size: att.contentLength || 0,
    })),
  };
}

/**
 * Main conversion function:
 *  - Parses .eml or .msg
 *  - Normalizes data
 *  - Renders PDF and/or HTML via CDOGS
 *  - Builds ZIP with rendered files + original attachments
 *
 * @param fileBuffer Raw ArrayBuffer from uploaded file
 * @param filename Original filename (used to detect format)
 * @param outputFormat 'pdf' | 'html' | 'both'
 * @returns Promise<Buffer> containing the ZIP file
 */
export async function convertEmailToZip(
  file: File,
  outputFormat: "pdf" | "html" | "both" = "both",
): Promise<Buffer> {
  const filenameLower = file.name.toLowerCase();
  const isEml = filenameLower.endsWith(".eml");
  const isMsg = filenameLower.endsWith(".msg");

  if (!isEml && !isMsg) {
    throw new Error("Only .eml and .msg files are supported");
  }

  let parsed: any;
  try {
    // Buffer.from() usually resolves type conflicts with both libraries
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isEml) {
      parsed = await simpleParser(buffer);
    } else {
      const reader = new MsgReader(arrayBuffer);
      parsed = reader;
    }
  } catch (err: any) {
    throw new Error(`Failed to parse file: ${err.message}`);
  }

  // Normalize data for CDOGS template
  const emailData = normalizeEmailData(parsed, isEml);
  const dataForTemplate = { email: emailData };

  // ── Build ZIP ────────────────────────────────────────────────
  const archive = archiver("zip", { zlib: { level: 6 } });
  const chunks: Uint8Array[] = [];

  archive.on("data", (chunk: Buffer | Uint8Array) => {
    chunks.push(new Uint8Array(chunk));
  });

  archive.on("error", (err: Error) => {
    throw new Error(`ZIP creation failed: ${err.message}`);
  });

  // Add the JSON data to the zip for inspection
  archive.append(JSON.stringify(dataForTemplate, null, 2), {
    name: "email_data.json",
  });

  const formats: ("pdf" | "html")[] =
    outputFormat === "both" ? ["pdf", "html"] : [outputFormat];

  for (const fmt of formats) {
    try {
      console.log("Rendering formats:", fmt);
      const rendered = await renderWithCdogs(dataForTemplate, fmt);
      archive.append(Buffer.from(rendered), {
        name: `${filenameLower}.${fmt}`,
      });
    } catch (err: any) {
      console.error(`Failed to render ${fmt}:`, err.message);
      archive.append(
        Buffer.from(
          `Generation of ${fmt.toUpperCase()} failed:\n${err.message}`,
        ),
        { name: `_error_${fmt}.txt` },
      );
    }
  }

  console.log("Adding attachments to zip");
  // ── Add original attachments ────────────────────────────────
  if (isEml) {
    for (const att of parsed.attachments || []) {
      try {
        const attName =
          att.filename || `attachment_${randomUUID().slice(0, 8)}`;
        const safeName = path.basename(attName);
        archive.append(att.content, { name: `attachments/${safeName}` });
      } catch (err) {
        console.warn("Skipped eml attachment:", err);
      }
    }
  } else {
    const msgData = parsed.getFileData ? parsed.getFileData() : parsed;
    for (const att of msgData.attachments || []) {
      try {
        const fullAtt = parsed.getAttachment ? parsed.getAttachment(att) : att;
        const attName =
          fullAtt.fileName ||
          fullAtt.fileNameShort ||
          att.fileName ||
          att.fileNameShort ||
          `attachment_${randomUUID().slice(0, 8)}`;
        const safeName = path.basename(attName);

        const content = fullAtt.content
          ? Buffer.from(fullAtt.content)
          : Buffer.from([]);

        archive.append(content, { name: `attachments/${safeName}` });
      } catch (err) {
        console.warn("Skipped msg attachment:", err);
      }
    }
  }

  console.log("Finalizing zip archive");
  // Finalize archive
  archive.finalize();

  // Wait for completion
  await new Promise<void>((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });

  const zipBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

  console.log("zip size:", zipBuffer.length);
  console.log("Done");
  return zipBuffer;
}
