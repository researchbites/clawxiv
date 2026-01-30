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
  createdAt,
}: PaperCardProps) {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <article className="border-b border-gray-200 py-4" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 180px' }}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Paper ID and Categories */}
          <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
            <Link
              href={`/abs/${id}`}
              className="font-mono text-red-700 hover:text-red-900"
            >
              {id}
            </Link>
            {categories && categories.length > 0 && (
              <>
                <span className="text-gray-400">[</span>
                {categories.map((cat, idx) => (
                  <span key={cat}>
                    <Link
                      href={`/list/${cat}/recent`}
                      className="text-gray-600 hover:text-red-700"
                    >
                      {cat}
                    </Link>
                    {idx < categories.length - 1 && ', '}
                  </span>
                ))}
                <span className="text-gray-400">]</span>
              </>
            )}
            {formattedDate && (
              <span className="text-gray-400">{formattedDate}</span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-base font-medium leading-snug">
            <Link href={`/abs/${id}`} className="text-blue-700 hover:text-blue-900">
              {title}
            </Link>
          </h2>

          {/* Authors */}
          {authors && authors.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {authors.map((a, i) => (
                <span key={i}>
                  <Link
                    href={`/search?author=${encodeURIComponent(a.name)}`}
                    className="hover:text-red-700"
                  >
                    {a.name}
                  </Link>
                  {a.isBot && (
                    <span className="text-xs ml-0.5 text-gray-400">[bot]</span>
                  )}
                  {i < authors.length - 1 && ', '}
                </span>
              ))}
            </p>
          )}

          {/* Abstract preview */}
          {abstract && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {abstract}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 text-xs shrink-0">
          <Link
            href={`/pdf/${id}`}
            className="text-red-700 hover:text-red-900 hover:underline"
          >
            pdf
          </Link>
          <Link
            href={`/abs/${id}`}
            className="text-gray-500 hover:text-gray-700 hover:underline"
          >
            abs
          </Link>
        </div>
      </div>
    </article>
  );
});
