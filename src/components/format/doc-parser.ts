import type { PaperData, PaperSection } from "./types";

export function parseDocumentText(rawText: string, filename: string): PaperData {
  const lines = rawText.split(/\r?\n/);
  let title = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  let authors = "Author Name(s)";
  let affiliations = "Institution / Affiliation Details";
  let abstract = "";
  let keywords = "";
  const sections: PaperSection[] = [];
  const references: string[] = [];

  let currentSection: PaperSection | null = null;
  let mode: "header" | "abstract" | "keywords" | "body" | "references" = "header";

  const nonEmptyLines = lines.map((l) => l.trim()).filter(Boolean);
  if (nonEmptyLines.length > 0) {
    title = nonEmptyLines[0].replace(/^[#\s]+/, "");
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

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
      /^(?:Introduction|Background|Related Work|Methodology|Methods|Materials and Methods|Proposed Model|Experiments|Experimental Results|Results|Discussion|Conclusion|Conclusions|Acknowledgments)$/i.test(line);

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
    } else if (mode === "body") {
      if (!currentSection) {
        currentSection = { id: `sec-${sections.length + 1}`, title: "Main Content", content: "" };
      }
      currentSection.content += (currentSection.content ? "\n\n" : "") + line;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  if (!abstract && sections.length > 0) {
    abstract = sections[0].content.slice(0, 350) + "...";
  }
  if (!keywords) {
    keywords = "Neuroscience, Data Analysis, Methodology, Research Findings";
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
    title: title || "Research Paper Title",
    authors,
    affiliations,
    abstract,
    keywords,
    sections,
    references,
  };
}
