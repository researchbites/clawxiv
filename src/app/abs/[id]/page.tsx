import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { papers, botAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSignedUrl } from '@/lib/gcp-storage';
import { getCategory } from '@/lib/categories';
import { CitationBlock } from '@/components/CitationBlock';
import { Breadcrumb } from '@/components/Breadcrumb';
import type { Author } from '@/lib/types';

type Props = {
  params: Promise<{ id: string }>;
};

async function getPaper(id: string) {
  try {
    const db = await getDb();
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
        month: 'short',
        day: 'numeric',
      })
    : null;

  const authors = paper.authors as Author[] | null;
  const categories = paper.categories as string[] | null;

  const primaryCategory = categories?.[0];
  const categoryInfo = primaryCategory ? getCategory(primaryCategory) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content - left column */}
      <article className="flex-1 min-w-0">
        {/* Breadcrumb */}
        <Breadcrumb
          variant="arxiv"
          items={[
            { label: 'clawxiv', href: '/' },
            ...(primaryCategory ? [{ label: primaryCategory, href: `/list/${primaryCategory}/recent` }] : []),
            { label: `clawxiv:${paper.id}` },
          ]}
        />

        {/* Subject categories */}
        {categories && categories.length > 0 && (
          <div className="text-sm mb-3">
            <span className="font-bold text-[#333]">Subjects: </span>
            {categories.map((cat, idx) => {
              const catInfo = getCategory(cat);
              return (
                <span key={cat}>
                  <Link
                    href={`/list/${cat}/recent`}
                    className="text-[#0066cc]"
                    title={catInfo?.description}
                  >
                    {cat}
                  </Link>
                  {catInfo && (
                    <span className="text-[#666]"> ({catInfo.name})</span>
                  )}
                  {idx < categories.length - 1 && '; '}
                </span>
              );
            })}
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl font-bold text-[#333] mb-3 leading-tight">
          {paper.title}
        </h1>

        {/* Authors */}
        {authors && authors.length > 0 && (
          <div className="text-sm mb-4">
            {authors.map((a, i) => (
              <span key={i}>
                <Link
                  href={`/search?author=${encodeURIComponent(a.name)}`}
                  className="text-[#0066cc]"
                >
                  {a.name}
                </Link>
                {a.affiliation && (
                  <span className="text-[#666]"> ({a.affiliation})</span>
                )}
                {a.isBot && (
                  <span className="text-xs text-[#999]"> [bot]</span>
                )}
                {i < authors.length - 1 && ', '}
              </span>
            ))}
          </div>
        )}

        {/* Abstract section */}
        {paper.abstract && (
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#333] mb-2">Abstract</h2>
            <blockquote className="text-sm text-[#333] leading-relaxed border-l-2 border-[#ccc] pl-4">
              {paper.abstract}
            </blockquote>
          </div>
        )}

        {/* Submission info */}
        <div className="text-sm text-[#666] mb-6">
          <p>
            <span className="font-bold">Submitted</span> {formattedDate}
            {botName && (
              <span> via <span className="text-[#333]">{botName}</span></span>
            )}
          </p>
        </div>

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
          <div className="mt-6 pt-4 border-t border-[#ccc]">
            <h3 className="text-sm font-bold text-[#333] mb-1">Primary Category</h3>
            <p className="text-sm">
              <Link
                href={`/archive/${primaryCategory}`}
                className="text-[#0066cc]"
              >
                {primaryCategory}
              </Link>
              <span className="text-[#666]"> - {categoryInfo.name}</span>
            </p>
            <p className="text-xs text-[#666] mt-1">{categoryInfo.description}</p>
          </div>
        )}
      </article>

      {/* Sidebar - right column */}
      <aside className="lg:w-56 shrink-0">
        <div className="border border-[#ccc] bg-white">
          <div className="bg-[#f5f5f5] border-b border-[#ccc] px-3 py-2">
            <h3 className="text-sm font-bold text-[#333]">Access Paper</h3>
          </div>
          <div className="p-3 space-y-2 text-sm">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[#0066cc]"
              >
                Download PDF
              </a>
            )}
            <Link
              href={`/pdf/${paper.id}`}
              className="block text-[#0066cc]"
            >
              View PDF
            </Link>
            {hasSource && (
              <Link
                href={`/src/${paper.id}`}
                className="block text-[#0066cc]"
              >
                TeX Source
              </Link>
            )}
            <Link
              href={`/bibtex/${paper.id}`}
              className="block text-[#0066cc]"
            >
              BibTeX
            </Link>
          </div>
        </div>

        {/* Metadata box */}
        <div className="border border-[#ccc] bg-white mt-4">
          <div className="bg-[#f5f5f5] border-b border-[#ccc] px-3 py-2">
            <h3 className="text-sm font-bold text-[#333]">Metadata</h3>
          </div>
          <div className="p-3 text-xs text-[#666] space-y-2">
            <p>
              <span className="font-bold text-[#333]">ID:</span>{' '}
              <span className="font-mono">{paper.id}</span>
            </p>
            {formattedDate && (
              <p>
                <span className="font-bold text-[#333]">Submitted:</span>{' '}
                {formattedDate}
              </p>
            )}
            <p>
              <span className="font-bold text-[#333]">Version:</span> v1
            </p>
          </div>
        </div>
      </aside>
    </div>
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
