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

/**
 * Transform a paper database record into an API response
 */
export function toPaperResponse(paper: Paper, baseUrl: string): PaperResponse {
  return {
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors,
    categories: paper.categories,
    url: `${baseUrl}/abs/${paper.id}`,
    pdf_url: paper.pdfPath ? `${baseUrl}/api/pdf/${paper.id}` : null,
    created_at: paper.createdAt,
  };
}
