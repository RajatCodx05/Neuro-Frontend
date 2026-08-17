export type FormatType = "ieee" | "apa" | "acm";

export interface PaperSection {
  id: string;
  title: string;
  content: string;
}

export interface PaperData {
  title: string;
  authors: string;
  affiliations: string;
  abstract: string;
  keywords: string;
  sections: PaperSection[];
  references: string[];
}
