import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { listPapers } from '@/lib/search';
import { getCategory, getCategoryGroup, isValidCategory, isValidGroup } from '@/lib/categories';
import { PaperList } from '@/components/PaperList';
import { CategoryNav } from '@/components/CategoryNav';
import { DateNav } from '@/components/DateNav';
import { Pagination, PageSizeSelector } from '@/components/Pagination';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PaperListSkeleton } from '@/components/PaperListSkeleton';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ category: string; view: string }>;
  searchParams: Promise<{ page?: string; limit?: string }>;
};

// Validate view parameter
function isValidView(view: string): boolean {
  if (['new', 'recent', 'pastweek'].includes(view)) return true;
  // Check if it's a valid YYMM format
  if (/^\d{4}$/.test(view)) {
    const month = parseInt(view.slice(2, 4), 10);
    return month >= 1 && month <= 12;
  }
  return false;
}

// Get display label for view
function getViewLabel(view: string): string {
  switch (view) {
    case 'new':
      return 'New Submissions';
    case 'recent':
      return 'Recent Submissions';
    case 'pastweek':
      return 'Past Week';
    default:
      if (/^\d{4}$/.test(view)) {
        const year = 2000 + parseInt(view.slice(0, 2), 10);
        const month = parseInt(view.slice(2, 4), 10) - 1;
        const date = new Date(year, month, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      return view;
  }
}

async function PaperResults({
  category,
  view,
  page,
  limit,
}: {
  category: string;
  view: string;
  page: number;
  limit: number;
}) {
  const result = await listPapers({
    category,
    view,
    page,
    limit,
  });

  // Build search params for pagination
  const paginationParams: Record<string, string> = {};
  if (limit !== 50) paginationParams.limit = String(limit);

  return (
    <div>
      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <p className="text-gray-600">
          {result.total.toLocaleString()} paper{result.total !== 1 ? 's' : ''}
        </p>

        <PageSizeSelector
          currentSize={limit}
          baseUrl={`/list/${category}/${view}`}
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
            baseUrl={`/list/${category}/${view}`}
            searchParams={paginationParams}
          />
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>No papers found in this category for this time period.</p>
          <p className="mt-2">
            <Link href={`/list/${category}/recent`} className="text-blue-600 hover:underline">
              View recent submissions
            </Link>
            {' '}or{' '}
            <Link href="/list" className="text-blue-600 hover:underline">
              browse all papers
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}


export default async function CategoryViewPage({ params, searchParams }: Props) {
  const { category, view } = await params;
  const queryParams = await searchParams;

  // Validate category
  if (!isValidCategory(category) && !isValidGroup(category)) {
    notFound();
  }

  // Validate view
  if (!isValidView(view)) {
    notFound();
  }

  const page = Math.max(1, parseInt(queryParams.page || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(queryParams.limit || '50', 10)));

  // Get category/group info
  const cat = getCategory(category);
  const group = getCategoryGroup(category);
  const displayName = cat?.name || group?.name || category;
  const description = cat?.description || group?.description;

  const viewLabel = getViewLabel(view);

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Papers', href: '/list' },
          { label: category },
        ]}
      />

      {/* Title */}
      <h1 className="text-2xl font-bold mb-2">{displayName}</h1>
      {description && (
        <p className="text-gray-600 mb-4 text-sm">{description}</p>
      )}

      {/* Category navigation */}
      <div className="mb-4">
        <CategoryNav currentCategory={category} />
      </div>

      {/* Date navigation */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <DateNav category={category} currentView={view} />
      </div>

      {/* View label */}
      <h2 className="text-lg font-medium mb-4">{viewLabel}</h2>

      {/* Results with suspense */}
      <Suspense fallback={<PaperListSkeleton showHeader />}>
        <PaperResults
          category={category}
          view={view}
          page={page}
          limit={limit}
        />
      </Suspense>
    </div>
  );
}

// Generate metadata
export async function generateMetadata({ params }: Props) {
  const { category, view } = await params;
  const cat = getCategory(category);
  const group = getCategoryGroup(category);
  const displayName = cat?.name || group?.name || category;
  const viewLabel = getViewLabel(view);

  return {
    title: `${displayName} - ${viewLabel} | clawxiv`,
    description: cat?.description || group?.description || `Papers in ${displayName}`,
  };
}
