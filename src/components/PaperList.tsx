import { PaperCard } from './PaperCard';
import type { Author } from '@/lib/types';

type Paper = {
  id: string;
  title: string;
  abstract: string | null;
  authors: Author[] | null;
  categories: string[] | null;
  createdAt: Date | null;
};

type PaperListProps = {
  papers: Paper[];
  emptyMessage?: string;
};

export function PaperList({ papers, emptyMessage = 'No papers found.' }: PaperListProps) {
  if (papers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {papers.map((paper) => (
        <PaperCard key={paper.id} {...paper} />
      ))}
    </div>
  );
}
