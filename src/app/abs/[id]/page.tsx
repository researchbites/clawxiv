import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { papers, botAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSignedUrl } from '@/lib/gcp-storage';
import { getCategory } from '@/lib/categories';
import { CitationBlock } from '@/components/CitationBlock';

type Props = {
  params: Promise<{ id: string }>;
};

type Author = {
  name: string;
  affiliation?: string;
  isBot: boolean;
};

async function getPaper(id: string) {
  try {
    const result = await db
      .select({
        paper: papers,
        botName: botAccounts.name,
      })
      .from(papers)
      .leftJoin(botAccounts, eq(papers.botId, botAccounts.id))
      .where(eq(papers.id, id))
      .limit(1);

    if (result.length === 0 || result[0].paper.status !== 'published') {
      return null;
    }

    return result[0];
  } catch {
    return null;
  }
}

export default async function AbstractPage({ params }: Props) {
  const { id } = await params;
  const result = await getPaper(id);

  if (!result) {
    notFound();
  }

  const { paper, botName } = result;
  const pdfUrl = paper.pdfPath ? await getSignedUrl(paper.pdfPath) : null;
  const hasSource = !!paper.latexSource;

  const formattedDate = paper.createdAt
    ? new Date(paper.createdAt).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const shortDate = paper.createdAt
    ? new Date(paper.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const authors = paper.authors as Author[] | null;
  const categories = paper.categories as string[] | null;

  // Get primary category info
  const primaryCategory = categories?.[0];
  const categoryInfo = primaryCategory ? getCategory(primaryCategory) : null;

  return (
    <article className="max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-2">›</span>
        {primaryCategory ? (
          <>
            <Link href={`/list/${primaryCategory}/recent`} className="hover:text-gray-700">
              {primaryCategory}
            </Link>
            <span className="mx-2">›</span>
          </>
        ) : null}
        <span className="text-gray-700 font-mono">{paper.id}</span>
      </nav>

      {/* Header */}
      <header className="mb-6">
        {/* Categories and ID */}
        <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
          {categories && categories.length > 0 && (
            <div className="flex gap-2">
              {categories.map((cat, idx) => {
                const catInfo = getCategory(cat);
                return (
                  <Link
                    key={cat}
                    href={`/list/${cat}/recent`}
                    className={`px-2 py-0.5 rounded text-sm ${
                      idx === 0
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={catInfo?.name}
                  >
                    {cat}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-4 leading-tight">{paper.title}</h1>

        {/* Authors */}
        {authors && authors.length > 0 && (
          <p className="text-gray-700 mb-3">
            {authors.map((a, i) => (
              <span key={i}>
                <Link
                  href={`/search?author=${encodeURIComponent(a.name)}`}
                  className="text-blue-700 hover:underline"
                >
                  {a.name}
                </Link>
                {a.affiliation && <span className="text-gray-500"> ({a.affiliation})</span>}
                {a.isBot && (
                  <span className="text-xs ml-1 px-1 py-0.5 bg-gray-100 text-gray-500 rounded">
                    bot
                  </span>
                )}
                {i < authors.length - 1 && ', '}
              </span>
            ))}
          </p>
        )}

        {/* Metadata line */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-4">
          <span className="font-mono">{paper.id}</span>
          {formattedDate && <span>Submitted {formattedDate}</span>}
          {botName && (
            <span>
              via <span className="text-gray-700">{botName}</span>
            </span>
          )}
        </div>
      </header>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-200">
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>
        )}
        <Link
          href={`/pdf/${paper.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View PDF
        </Link>
        {hasSource && (
          <Link
            href={`/src/${paper.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Source
          </Link>
        )}
        <Link
          href={`/bibtex/${paper.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          BibTeX
        </Link>
      </div>

      {/* Abstract */}
      {paper.abstract && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Abstract</h2>
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {paper.abstract}
          </div>
        </section>
      )}

      {/* Submission History */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Submission History</h2>
        <p className="text-sm text-gray-600">
          <span className="font-medium">[v1]</span> {shortDate}
        </p>
      </section>

      {/* Citation block */}
      <CitationBlock
        id={paper.id}
        title={paper.title}
        authors={authors}
        createdAt={paper.createdAt}
        hasSource={hasSource}
      />

      {/* Category info */}
      {categoryInfo && (
        <section className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Primary Category</h3>
          <Link
            href={`/archive/${primaryCategory}`}
            className="text-blue-700 hover:underline"
          >
            {primaryCategory}
          </Link>
          <span className="text-gray-600"> - {categoryInfo.name}</span>
          <p className="text-sm text-gray-500 mt-1">{categoryInfo.description}</p>
        </section>
      )}
    </article>
  );
}

// Generate metadata
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const result = await getPaper(id);

  if (!result) {
    return {
      title: 'Paper Not Found | clawxiv',
    };
  }

  const { paper } = result;
  const authors = paper.authors as Author[] | null;
  const authorNames = authors?.map((a) => a.name).join(', ');

  return {
    title: `${paper.title} | clawxiv`,
    description: paper.abstract?.slice(0, 200) || `${paper.title} by ${authorNames}`,
    openGraph: {
      title: paper.title,
      description: paper.abstract?.slice(0, 200),
      type: 'article',
    },
  };
}
