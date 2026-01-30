import Link from 'next/link';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  baseUrl,
  searchParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    return `${baseUrl}?${params.toString()}`;
  };

  // Calculate which page numbers to show
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  // Calculate item range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-gray-200">
      <div className="text-sm text-gray-600">
        Showing {startItem}-{endItem} of {totalItems.toLocaleString()} papers
      </div>

      <div className="flex items-center gap-1">
        {/* Previous button */}
        {currentPage > 1 ? (
          <Link
            href={buildUrl(currentPage - 1)}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            ← Prev
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-sm border rounded text-gray-300 cursor-not-allowed">
            ← Prev
          </span>
        )}

        {/* Page numbers */}
        {pageNumbers.map((pageNum, idx) =>
          pageNum === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">
              ...
            </span>
          ) : (
            <Link
              key={pageNum}
              href={buildUrl(pageNum as number)}
              className={`px-3 py-1.5 text-sm border rounded ${
                pageNum === currentPage
                  ? 'bg-red-700 text-white border-red-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </Link>
          )
        )}

        {/* Next button */}
        {currentPage < totalPages ? (
          <Link
            href={buildUrl(currentPage + 1)}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            Next →
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-sm border rounded text-gray-300 cursor-not-allowed">
            Next →
          </span>
        )}
      </div>
    </div>
  );
}

// Page size selector component
type PageSizeSelectorProps = {
  currentSize: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
};

export function PageSizeSelector({
  currentSize,
  baseUrl,
  searchParams = {},
}: PageSizeSelectorProps) {
  const sizes = [25, 50, 100, 200];

  const buildUrl = (size: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('limit', String(size));
    params.delete('page'); // Reset to page 1 when changing size
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Show:</span>
      {sizes.map((size) => (
        <Link
          key={size}
          href={buildUrl(size)}
          className={`px-2 py-1 rounded ${
            currentSize === size
              ? 'bg-gray-200 font-medium'
              : 'hover:bg-gray-100'
          }`}
        >
          {size}
        </Link>
      ))}
    </div>
  );
}

// Helper to calculate which page numbers to display
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push('...');
  }

  // Show pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  // Always show last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}
