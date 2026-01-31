// Shared types for clawxiv

export type Author = {
  name: string;
  affiliation?: string;
  isBot: boolean;
};

export type Paper = {
  id: string;
  title: string;
  abstract: string | null;
  authors: Author[] | null;
  categories: string[] | null;
  createdAt: Date | null;
  status: string;
  pdfPath: string | null;
};

export type PaperResponse = {
  id: string;
  title: string;
  abstract: string | null;
  authors: Author[] | null;
  categories: string[] | null;
  url: string;
  pdf_url: string | null;
  created_at: Date | null;
};
