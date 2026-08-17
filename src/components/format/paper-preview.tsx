import type { FormatType, PaperData } from "./types";
import { toRoman, formatReferenceItem } from "./export-helpers";

interface Props {
  paperData: PaperData;
  selectedFormat: FormatType;
  twoColumn: boolean;
}

export function PaperPreview({ paperData, selectedFormat, twoColumn }: Props) {
  return (
    <div className="mx-auto max-w-4xl bg-white text-black dark:bg-[#12141a] dark:text-zinc-100 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8 sm:p-14 font-serif transition-colors duration-200">
      <div className="text-center mb-8 border-b pb-6 border-zinc-200 dark:border-zinc-800">
        <div className="mb-2 inline-block font-mono text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          {selectedFormat === "ieee"
            ? "IEEE Transactions on Neural Systems & Machine Learning"
            : selectedFormat === "apa"
            ? "American Psychological Association (APA 7th Edition) Format"
            : "ACM SIGPROCEEDINGS TEMPLATE"}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans mt-2">
          {paperData.title}
        </h1>

        <div className="mt-4 text-sm font-sans font-medium text-zinc-800 dark:text-zinc-200">
          {paperData.authors}
        </div>
        <div className="text-xs font-sans italic text-zinc-500 dark:text-zinc-400 mt-1">
          {paperData.affiliations}
        </div>
      </div>

      <div className="mb-8 font-sans bg-zinc-50 dark:bg-zinc-900/60 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800/80 text-xs sm:text-sm leading-relaxed">
        <p className="text-justify">
          <span className="font-bold font-sans">
            {selectedFormat === "ieee" ? "Abstract—" : selectedFormat === "acm" ? "ABSTRACT: " : "Abstract: "}
          </span>
          <span className="text-zinc-700 dark:text-zinc-300">{paperData.abstract}</span>
        </p>
        {paperData.keywords && (
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              {selectedFormat === "ieee" ? "Index Terms—" : selectedFormat === "apa" ? "Keywords: " : "CCS Concepts & Keywords: "}
            </span>
            <span>{paperData.keywords}</span>
          </p>
        )}
      </div>

      <div
        className={`${
          twoColumn && (selectedFormat === "ieee" || selectedFormat === "acm")
            ? "columns-1 md:columns-2 gap-8 [column-rule:1px_solid_rgba(150,150,150,0.2)]"
            : "space-y-6"
        }`}
      >
        {paperData.sections.map((sec, idx) => {
          const headingText =
            selectedFormat === "ieee"
              ? `${toRoman(idx + 1)}. ${sec.title.toUpperCase()}`
              : selectedFormat === "acm"
              ? `${idx + 1} ${sec.title.toUpperCase()}`
              : sec.title;

          return (
            <div key={sec.id} className="break-inside-avoid mb-6 font-serif">
              <h2
                className={`font-sans font-bold text-zinc-900 dark:text-zinc-100 mb-2.5 ${
                  selectedFormat === "ieee"
                    ? "text-xs tracking-wider border-b border-zinc-300 dark:border-zinc-800 pb-1"
                    : selectedFormat === "apa"
                    ? "text-base text-center font-bold"
                    : "text-sm tracking-wide"
                }`}
              >
                {headingText}
              </h2>
              <div className="text-xs sm:text-[13px] leading-relaxed text-justify text-zinc-800 dark:text-zinc-300 space-y-3">
                {sec.content.split("\n\n").map((para, pIdx) => (
                  <p key={pIdx} className="text-indent-4 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          );
        })}

        <div className="break-inside-avoid mb-6 font-serif pt-4">
          <h2 className="font-sans font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            {selectedFormat === "ieee"
              ? `${toRoman(paperData.sections.length + 1)}. REFERENCES`
              : selectedFormat === "acm"
              ? `${paperData.sections.length + 1} REFERENCES`
              : "References"}
          </h2>
          <ol className="text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-400 space-y-2 leading-normal">
            {paperData.references.map((ref, idx) => (
              <li
                key={idx}
                className={selectedFormat === "apa" ? "pl-5 -indent-5" : ""}
              >
                {formatReferenceItem(ref, idx, selectedFormat)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
