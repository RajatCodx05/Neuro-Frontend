import type { FormatType, PaperData } from "./types";

export function toRoman(num: number): string {
  const romanMap = [
    { val: 10, sym: "X" },
    { val: 9, sym: "IX" },
    { val: 5, sym: "V" },
    { val: 4, sym: "IV" },
    { val: 1, sym: "I" },
  ];
  let res = "";
  let n = num;
  for (const { val, sym } of romanMap) {
    while (n >= val) {
      res += sym;
      n -= val;
    }
  }
  return res || "I";
}

export function formatReferenceItem(refText: string, idx: number, format: FormatType): string {
  if (format === "ieee" || format === "acm") {
    return `[${idx + 1}] ${refText.replace(/^\[\d+\]\s*/, "")}`;
  }
  return refText.replace(/^\[\d+\]\s*/, "");
}

export function generateFormattedPlainText(paperData: PaperData, format: FormatType): string {
  let out = "";

  if (format === "ieee") {
    out += `${paperData.title.toUpperCase()}\n\n`;
    out += `${paperData.authors}\n${paperData.affiliations}\n\n`;
    out += `Abstract—${paperData.abstract}\n\n`;
    out += `Index Terms—${paperData.keywords}\n\n`;
    paperData.sections.forEach((sec, idx) => {
      out += `${toRoman(idx + 1)}. ${sec.title.toUpperCase()}\n\n${sec.content}\n\n`;
    });
    out += `${toRoman(paperData.sections.length + 1)}. REFERENCES\n\n`;
    paperData.references.forEach((ref, idx) => {
      out += `[${idx + 1}] ${ref.replace(/^\[\d+\]\s*/, "")}\n`;
    });
  } else if (format === "apa") {
    out += `${paperData.title}\n\n`;
    out += `${paperData.authors}\n${paperData.affiliations}\n\n`;
    out += `Abstract\n${paperData.abstract}\nKeywords: ${paperData.keywords}\n\n`;
    paperData.sections.forEach((sec) => {
      out += `${sec.title}\n\n${sec.content}\n\n`;
    });
    out += `References\n\n`;
    paperData.references.forEach((ref) => {
      out += `${ref.replace(/^\[\d+\]\s*/, "")}\n\n`;
    });
  } else {
    out += `${paperData.title}\n\n`;
    out += `${paperData.authors}\n${paperData.affiliations}\n\n`;
    out += `ABSTRACT\n${paperData.abstract}\n\n`;
    out += `CCS CONCEPTS • Applied computing ~ Life and medical sciences • Computing methodologies ~ Machine learning\n\n`;
    out += `KEYWORDS\n${paperData.keywords}\n\n`;
    paperData.sections.forEach((sec, idx) => {
      out += `${idx + 1} ${sec.title.toUpperCase()}\n\n${sec.content}\n\n`;
    });
    out += `${paperData.sections.length + 1} REFERENCES\n\n`;
    paperData.references.forEach((ref, idx) => {
      out += `[${idx + 1}] ${ref.replace(/^\[\d+\]\s*/, "")}\n`;
    });
  }

  return out;
}

export function exportWordDoc(paperData: PaperData, format: FormatType) {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${paperData.title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.25; margin: 1in; }
        h1 { font-size: 18pt; text-align: center; font-weight: bold; margin-bottom: 12pt; }
        .authors { font-size: 11pt; text-align: center; margin-bottom: 6pt; }
        .affiliations { font-size: 9pt; text-align: center; font-style: italic; margin-bottom: 18pt; }
        .abstract { font-size: 9pt; font-weight: bold; margin-bottom: 12pt; }
        .keywords { font-size: 9pt; font-weight: bold; margin-bottom: 18pt; }
        h2 { font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 4pt; }
        p { font-size: 10pt; text-align: justify; margin-bottom: 8pt; text-indent: 14pt; }
        .reference { font-size: 9pt; margin-bottom: 4pt; text-indent: -14pt; margin-left: 14pt; }
      </style>
    </head>
    <body>
      <h1>${paperData.title}</h1>
      <div class="authors">${paperData.authors}</div>
      <div class="affiliations">${paperData.affiliations}</div>
      <div class="abstract"><b>Abstract</b>—${paperData.abstract}</div>
      <div class="keywords"><b>Keywords</b>—${paperData.keywords}</div>
      ${paperData.sections.map((sec, idx) => `
        <h2>${format === "ieee" ? `${toRoman(idx + 1)}. ${sec.title.toUpperCase()}` : sec.title}</h2>
        <p>${sec.content.replace(/\n\n/g, "</p><p>")}</p>
      `).join("")}
      <h2>${format === "ieee" ? `${toRoman(paperData.sections.length + 1)}. REFERENCES` : "References"}</h2>
      ${paperData.references.map((ref, idx) => `
        <div class="reference">${formatReferenceItem(ref, idx, format)}</div>
      `).join("")}
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${paperData.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}_${format}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
