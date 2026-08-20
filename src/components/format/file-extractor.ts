import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// Configure pdfjs worker for browser execution
try {
  if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
  }
} catch {
  // Ignore fallback
}

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (extension === "pdf") {
    return extractPdfText(file);
  } else if (extension === "docx") {
    return extractDocxText(file);
  } else {
    return readPlainTextFile(file);
  }
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY: number | null = null;
      let pageText = "";

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        
        // Detect newlines based on vertical offset
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += "\n";
        } else if (pageText.length > 0 && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
          pageText += " ";
        }
        
        pageText += item.str;
        lastY = item.transform[5];
      }

      if (pageText.trim()) {
        fullText += pageText.trim() + "\n\n";
      }
    }

    const cleaned = cleanExtractedText(fullText);
    if (!cleaned) {
      throw new Error("No readable text found in PDF pages.");
    }
    return cleaned;
  } catch (err: any) {
    console.warn("pdfjs-dist extraction issue:", err);
    // Fallback: extract clean text streams without binary markers
    return extractReadableAsciiFromBuffer(arrayBuffer, file.name);
  }
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const cleaned = cleanExtractedText(result.value);
    if (!cleaned) {
      throw new Error("Empty DOCX text");
    }
    return cleaned;
  } catch (err) {
    console.warn("mammoth docx extraction issue:", err);
    return readPlainTextFile(file);
  }
}

function readPlainTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      resolve(cleanExtractedText(text));
    };
    reader.onerror = () => reject(new Error("Failed to read text file."));
    reader.readAsText(file);
  });
}

function cleanExtractedText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\uFFFD/g, "") // Remove Unicode replacement diamonds
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove binary control characters
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractReadableAsciiFromBuffer(buffer: ArrayBuffer, filename: string): string {
  const bytes = new Uint8Array(buffer);
  let asciiStr = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      asciiStr += String.fromCharCode(b);
    } else if (b === 10 || b === 13) {
      asciiStr += "\n";
    }
  }
  // Strip PDF tags like /Type /Pages /Length stream etc.
  const lines = asciiStr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^(%PDF|<<|>>|\/Type|\/Font|\/Length|xref|trailer|startxref|\d+\s+\d+\s+obj|endobj|stream|endstream)/.test(l));

  if (lines.length === 0) {
    return `Document: ${filename}\n\nThis PDF document has been loaded. You can use the Section Editor to write or structure the paper content.`;
  }
  return lines.join("\n\n");
}
