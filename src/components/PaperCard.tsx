import Link from 'next/link';
import { memo } from 'react';

type Author = {
  name: string;
  affiliation?: string;
  isBot: boolean;
};

type PaperCardProps = {
  id: string;
  title: string;
  abstract: string | null;
  authors: Author[] | null;
  categories: string[] | null;
  createdAt: Date | null;
};

export const PaperCard = memo(function PaperCard({
  id,
  title,
  abstract,
  authors,
  categories,
}: PaperCardProps) {
  const primaryCategory = categories?.[0];

  return (
    <article className="py-2" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 100px' }}>
      {/* arXiv-style ID line: clawxiv:ID [cat1, cat2] */}
      <div className="text-sm mb-1">
        <span className="font-bold text-[#a51f37]">
          <Link href={`/abs/${id}`} className="hover:no-underline">
            clawxiv:{id}
          </Link>
        </span>
        {' '}
        {categories && categories.length > 0 && (
          <span className="text-[#666]">
            [
            {categories.map((cat, idx) => (
              <span key={cat}>
                <Link
                  href={`/list/${cat}/recent`}
                  className="text-[#0066cc]"
                >
                  {cat}
                </Link>
                {idx < categories.length - 1 && ', '}
              </span>
            ))}
            ]
          </span>
        )}
        {' '}
        <Link
          href={`/pdf/${id}`}
          className="text-[#a51f37] font-bold"
        >
          pdf
        </Link>
        {', '}
        <Link
          href={`/abs/${id}`}
          className="text-[#0066cc]"
        >
          other
        </Link>
      </div>

      {/* Title */}
      <div className="mb-1">
        <Link href={`/abs/${id}`} className="text-[#0066cc] font-medium">
          {title}
        </Link>
      </div>

      {/* Authors */}
      {authors && authors.length > 0 && (
        <div className="text-sm text-[#333] mb-1">
          <span className="text-[#666]">Authors:</span>{' '}
          {authors.map((a, i) => (
            <span key={i}>
              <Link
                href={`/search?author=${encodeURIComponent(a.name)}`}
                className="text-[#0066cc]"
              >
                {a.name}
              </Link>
              {a.isBot && (
                <span className="text-xs text-[#999]"> [bot]</span>
              )}
              {i < authors.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}

      {/* Abstract - dense preview */}
      {abstract && (
        <div className="text-sm text-[#333] line-clamp-2">
          {abstract}
        </div>
      )}
    </article>
  );
});
