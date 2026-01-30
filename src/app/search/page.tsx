import { Suspense } from 'react';
import Link from 'next/link';
import { searchPapers } from '@/lib/search';
import { PaperList } from '@/components/PaperList';
import { SearchBar } from '@/components/SearchBar';
import { SearchFilters } from '@/components/SearchFilters';
import { Pagination, PageSizeSelector } from '@/components/Pagination';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    query?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    page?: string;
    limit?: string;
  }>;
};

async function SearchResults({ searchParams }: { searchParams: Props['searchParams'] }) {
  const params = await searchParams;

  const query = params.query || '';
  const category = params.category || '';
  const dateFrom = params.date_from || '';
  const dateTo = params.date_to || '';
  const sortBy = (params.sort_by as 'date' | 'relevance') || 'date';
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(params.limit || '25', 10)));

  const result = await searchPapers({
    query: query || undefined,
    category: category || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
    page,
    limit,
  });

  // Build search params for pagination
  const paginationParams: Record<string, string> = {};
  if (query) paginationParams.query = query;
  if (category) paginationParams.category = category;
  if (dateFrom) paginationParams.date_from = dateFrom;
  if (dateTo) paginationParams.date_to = dateTo;
  if (sortBy !== 'date') paginationParams.sort_by = sortBy;
  if (limit !== 25) paginationParams.limit = String(limit);

  const hasQuery = query || category || dateFrom || dateTo;

  return (
    <div>
      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-sm">
        <div>
          {hasQuery ? (
            <p className="text-[#666]">
              {result.total.toLocaleString()} result{result.total !== 1 ? 's' : ''}
              {query && <> for <span className="font-bold text-[#333]">{query}</span></>}
              {category && <> in <span className="font-bold text-[#333]">{category}</span></>}
            </p>
          ) : (
            <p className="text-[#666]">
              Enter a search query or use filters
            </p>
          )}
        </div>

        <PageSizeSelector
          currentSize={limit}
          baseUrl="/search"
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
            baseUrl="/search"
            searchParams={paginationParams}
          />
        </>
      ) : hasQuery ? (
        <div className="text-sm text-[#666] py-8">
          <p>No papers found matching your search criteria.</p>
          <p className="mt-2">
            <Link href="/search/advanced" className="text-[#0066cc]">
              Try advanced search
            </Link>
            {' '}or{' '}
            <Link href="/list" className="text-[#0066cc]">
              browse all papers
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 w-48 mb-4"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="py-2">
          <div className="h-4 bg-gray-200 w-48 mb-1"></div>
          <div className="h-4 bg-gray-200 w-3/4 mb-1"></div>
          <div className="h-4 bg-gray-100 w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.query || '';

  return (
    <div>
      <h1 className="text-xl font-bold text-[#333] mb-4">Search Papers</h1>

      {/* Search bar */}
      <SearchBar
        defaultValue={query}
        placeholder="Search by title, author, or abstract..."
        className="mb-4"
      />

      {/* Inline filters + results */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className="md:w-48 shrink-0 text-sm">
          <Suspense fallback={<div className="h-48 bg-gray-100 animate-pulse" />}>
            <SearchFilters />
          </Suspense>

          <div className="mt-3 pt-3 border-t border-[#ccc]">
            <Link href="/search/advanced" className="text-[#0066cc]">
              Advanced Search
            </Link>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchResults searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
