import "server-only";

import JSZip from "jszip";
import ExcelJS from "exceljs";

export type AiAttachment =
  | { kind: "pdf"; fileName: string; content: string }
  | { kind: "text"; fileName: string; content: string };

const MAX_BYTES = 6 * 1024 * 1024;
const MAX_TEXT = 32_000;

function decodeEntities(value: string): string {
  const names: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_whole, match: string) => {
    if (match.startsWith("#x")) {
      const n = Number.parseInt(match.slice(2), 16);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    }
    if (match.startsWith("#")) {
      const n = Number(match.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    }
    return names[match.toLowerCase()] ?? "";
  });
}

function textFromWordXml(xml: string): string {
  return decodeEntities(
    xml
      .replace(/<w:tab\b[^>]*\/?\s*>/g, "\t")
      .replace(/<w:br\b[^>]*\/?\s*>/g, "\n")
      .replace(/<\/w:p\s*>/g, "\n")
      .replace(/<\/w:tr\s*>/g, "\n")
      .replace(/<\/w:tc\s*>/g, " | ")
      .replace(/<[^>]*>/g, ""),
  ).replace(/\n{3,}/g, "\n\n").trim();
}

function cellDisplay(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined) return String(value.result ?? "");
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("formula" in value) return `[formula: ${String(value.formula)}]`;
  }
  return "";
}

export async function readAiAttachment(file: File): Promise<AiAttachment> {
  const name = file.name.replace(/[\\/\r\n]/g, "_").slice(0, 160);
  const ext = name.split(".").pop()?.toLowerCase();
  if (!name || !ext) throw new Error("A named document is required.");
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new Error("Document must be between 1 byte and 6 MB.");
  }
  if (!["pdf", "docx", "xlsx", "txt", "md", "csv"].includes(ext)) {
    throw new Error("Supported files: PDF, DOCX, XLSX, TXT, MD, CSV.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (ext === "pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("This file does not appear to be a valid PDF.");
    }
    return {
      kind: "pdf",
      fileName: name,
      content: `data:application/pdf;base64,${buffer.toString("base64")}`,
    };
  }
  let content: string;
  if (ext === "docx") {
    const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
    const document = zip.file("word/document.xml");
    if (!document) throw new Error("Word document content not found.");
    const xml = await document.async("string");
    if (xml.length > 2_000_000) throw new Error("Word document is too large to analyze safely.");
    content = textFromWordXml(xml);
  } else if (ext === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const lines: string[] = [];
    for (const sheet of workbook.worksheets.slice(0, 3)) {
      lines.push(`Sheet: ${sheet.name}`);
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 120 || lines.join("\n").length > MAX_TEXT) return;
        const cells: string[] = [];
        for (let col = 1; col <= Math.min(row.cellCount, 15); col += 1) {
          cells.push(cellDisplay(row.getCell(col).value));
        }
        lines.push(`Row ${rowNumber}: ${cells.join(" | ")}`);
      });
    }
    content = lines.join("\n");
  } else {
    content = buffer.toString("utf8").replace(/\0/g, "");
  }
  if (!content.trim()) throw new Error("The document contained no readable text.");
  const clipped = content.length > MAX_TEXT;
  return {
    kind: "text",
    fileName: name,
    content: `${content.slice(0, MAX_TEXT)}${clipped ? "\n[Document truncated; review the original for remaining information.]" : ""}`,
  };
}
