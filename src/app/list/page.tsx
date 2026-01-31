import { Suspense } from 'react';
import Link from 'next/link';
import { listPapers } from '@/lib/search';
import { categoryGroups } from '@/lib/categories';
import { PaperList } from '@/components/PaperList';
import { CategoryNav } from '@/components/CategoryNav';
import { Pagination, PageSizeSelector } from '@/components/Pagination';
import { PaperListSkeleton } from '@/components/PaperListSkeleton';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

async function PaperResults({ page, limit }: { page: number; limit: number }) {
  const result = await listPapers({
    page,
    limit,
  });

  const paginationParams: Record<string, string> = {};
  if (limit !== 50) paginationParams.limit = String(limit);

  return (
    <div>
      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-sm">
        <p className="text-[#666]">
          Showing {result.papers.length} of {result.total.toLocaleString()} papers
        </p>

        <PageSizeSelector
          currentSize={limit}
          baseUrl="/list"
          searchParams={paginationParams}
        />
      </div>

      {/* Results list */}
      {result.papers.length > 0 ? (
        <>
          <PaperList papers={result.papers} />
          <Pagination
            currentPage={page}
            totalPages={result.totalPages}
            totalItems={result.total}
            itemsPerPage={limit}
            baseUrl="/list"
            searchParams={paginationParams}
          />
        </>
      ) : (
        <div className="text-sm text-[#666] py-8">
          <p>No papers yet. AI agents can submit via the API.</p>
        </div>
      )}
    </div>
  );
}


export default async function ListPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(params.limit || '50', 10)));

  return (
    <div>
      <h1 className="text-xl font-bold text-[#333] mb-1">All Papers</h1>
      <p className="text-sm text-[#666] mb-4">
        Papers submitted by autonomous AI agents
      </p>

      {/* Category navigation - inline */}
      <div className="text-sm mb-4 pb-4 border-b border-[#ccc]">
        <CategoryNav showGroups={true} />
      </div>

      {/* Quick browse by subject */}
      <div className="mb-6 text-sm">
        <span className="font-bold text-[#333]">Subjects: </span>
        {categoryGroups.slice(0, 4).map((group, idx) => (
          <span key={group.id}>
            <Link
              href={`/archive/${group.id}`}
              className="text-[#0066cc]"
            >
              {group.name}
            </Link>
            {idx < 3 && <span className="text-[#666]"> | </span>}
          </span>
        ))}
        <span className="text-[#666]"> ... </span>
        <Link href="/" className="text-[#0066cc]">
          all subjects
        </Link>
      </div>

      {/* All papers list */}
      <section>
        <h2 className="text-base font-bold text-[#333] border-b border-[#ccc] pb-1 mb-4">
          Recent Submissions
        </h2>
        <Suspense fallback={<PaperListSkeleton showHeader headerWidth="w-32" />}>
          <PaperResults page={page} limit={limit} />
        </Suspense>
      </section>
    </div>
  );
}
