import type { PaperData, PaperSection } from "./types";

export function parseDocumentText(rawText: string, filename: string): PaperData {
  const lines = rawText.split(/\r?\n/);
  let cleanFilenameTitle = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  let title = cleanFilenameTitle || "Research Paper Title";
  let authors = "Author Name(s)";
  let affiliations = "Department of Research & Engineering, Academic Institute";
  let abstract = "";
  let keywords = "";
  const sections: PaperSection[] = [];
  const references: string[] = [];

  let currentSection: PaperSection | null = null;
  let mode: "header" | "abstract" | "keywords" | "body" | "references" = "header";

  const nonEmptyLines = lines.map((l) => l.trim()).filter(Boolean);
  if (nonEmptyLines.length > 0) {
    const firstLine = nonEmptyLines[0].replace(/^[#\s]+/, "").trim();
    // Validate that the first line is human readable and not binary metadata
    if (
      firstLine.length >= 3 &&
      firstLine.length <= 160 &&
      !/^(%PDF|<<|>>|\/Type|\/Length|\/Title|obj|xref)/i.test(firstLine)
    ) {
      title = firstLine;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Filter out binary metadata fragments if any slipped through
    if (/^(%PDF|<<|>>|\/Type|\/Font|\/Length|\d+\s+\d+\s+obj|endobj|stream|endstream)/i.test(line)) {
      continue;
    }

    if (/^(abstract|summary)[:\s—-]*/i.test(line)) {
      mode = "abstract";
      abstract = line.replace(/^(abstract|summary)[:\s—-]*/i, "").trim();
      continue;
    }

    if (/^(keywords|index terms|key words)[:\s—-]*/i.test(line)) {
      mode = "keywords";
      keywords = line.replace(/^(keywords|index terms|key words)[:\s—-]*/i, "").trim();
      continue;
    }

    if (/^(references|bibliography|works cited|literature cited)[:\s]*/i.test(line)) {
      mode = "references";
      if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
      continue;
    }

    const isHeading =
      /^#{1,3}\s+(.+)$/.test(line) ||
      /^(?:[IVXLCDM]+\.|\d+\.|\d+\.\d+)\s+([A-Z].+)$/.test(line) ||
      /^(?:Introduction|Overview|Background|Related Work|Architecture|Methodology|Implementation|Methods|Materials and Methods|Proposed Model|Experiments|Results|Discussion|Conclusion|Conclusions|Acknowledgments)$/i.test(line);

    if (isHeading && mode !== "references" && mode !== "abstract") {
      if (currentSection) {
        sections.push(currentSection);
      }
      const cleanTitle = line.replace(/^#{1,3}\s+/, "").replace(/^(?:[IVXLCDM]+\.|\d+\.|\d+\.\d+)\s+/, "").trim();
      currentSection = {
        id: `sec-${sections.length + 1}`,
        title: cleanTitle,
        content: "",
      };
      mode = "body";
      continue;
    }

    if (mode === "abstract") {
      if (isHeading) {
        mode = "body";
        const cleanTitle = line.replace(/^#{1,3}\s+/, "").replace(/^(?:[IVXLCDM]+\.|\d+\.|\d+\.\d+)\s+/, "").trim();
        currentSection = { id: `sec-${sections.length + 1}`, title: cleanTitle, content: "" };
      } else {
        abstract += (abstract ? " " : "") + line;
      }
    } else if (mode === "keywords") {
      keywords += (keywords ? " " : "") + line;
    } else if (mode === "references") {
      const cleanRef = line.replace(/^\[\d+\]\s*/, "").trim();
      if (cleanRef) {
        references.push(cleanRef);
      }
    } else if (mode === "body" || mode === "header") {
      if (!currentSection) {
        currentSection = { id: `sec-${sections.length + 1}`, title: "Introduction", content: "" };
      }
      currentSection.content += (currentSection.content ? "\n\n" : "") + line;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // If document was raw text without structured sections, chunk it gracefully
  if (sections.length === 1 && sections[0].content.length > 800) {
    const paragraphs = sections[0].content.split("\n\n").filter(Boolean);
    if (paragraphs.length >= 3) {
      const p1 = paragraphs.slice(0, Math.ceil(paragraphs.length / 3)).join("\n\n");
      const p2 = paragraphs.slice(Math.ceil(paragraphs.length / 3), Math.ceil((paragraphs.length * 2) / 3)).join("\n\n");
      const p3 = paragraphs.slice(Math.ceil((paragraphs.length * 2) / 3)).join("\n\n");
      sections.length = 0;
      sections.push(
        { id: "sec-1", title: "Introduction & Background", content: p1 },
        { id: "sec-2", title: "System Architecture & Methodology", content: p2 },
        { id: "sec-3", title: "Discussion & Results", content: p3 }
      );
    }
  }

  if (!abstract && sections.length > 0) {
    abstract = sections[0].content.slice(0, 300) + (sections[0].content.length > 300 ? "..." : "");
  }
  if (!keywords) {
    keywords = "Research, Data Analysis, Methodology, Engineering, Scientific Methods";
  }
  if (sections.length === 0) {
    sections.push({
      id: "sec-1",
      title: "Introduction",
      content: rawText.slice(0, 1000) || "Document content will appear here.",
    });
  }
  if (references.length === 0) {
    references.push(
      "Smith, J. (2024). Principles of Academic Research. Journal of Scientific Methods, 18(2), 112-125.",
      "Johnson, A., & Lee, K. (2023). Computational Frameworks in Modern Science. IEEE Access, 11, 4520-4530."
    );
  }

  return {
    title,
    authors,
    affiliations,
    abstract,
    keywords,
    sections,
    references,
  };
}
