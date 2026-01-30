'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { categoryGroups } from '@/lib/categories';

type SearchFiltersProps = {
  className?: string;
};

export function SearchFilters({ className = '' }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentCategory = searchParams.get('category') || '';
  const currentDateFrom = searchParams.get('date_from') || '';
  const currentDateTo = searchParams.get('date_to') || '';
  const currentSortBy = searchParams.get('sort_by') || 'date';

  const [category, setCategory] = useState(currentCategory);
  const [dateFrom, setDateFrom] = useState(currentDateFrom);
  const [dateTo, setDateTo] = useState(currentDateTo);
  const [sortBy, setSortBy] = useState(currentSortBy);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Update category
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }

    // Update date range
    if (dateFrom) {
      params.set('date_from', dateFrom);
    } else {
      params.delete('date_from');
    }

    if (dateTo) {
      params.set('date_to', dateTo);
    } else {
      params.delete('date_to');
    }

    // Update sort
    if (sortBy && sortBy !== 'date') {
      params.set('sort_by', sortBy);
    } else {
      params.delete('sort_by');
    }

    // Reset to page 1 when filters change
    params.delete('page');

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  }, [category, dateFrom, dateTo, sortBy, searchParams, router]);

  const clearFilters = useCallback(() => {
    const query = searchParams.get('query') || '';
    startTransition(() => {
      router.push(query ? `/search?query=${encodeURIComponent(query)}` : '/search');
    });
  }, [searchParams, router]);

  const hasFilters = currentCategory || currentDateFrom || currentDateTo || currentSortBy !== 'date';

  return (
    <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
      <h3 className="font-medium mb-4">Filters</h3>

      {/* Category filter */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {categoryGroups.map((group) => (
            <optgroup key={group.id} label={group.name}>
              {group.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.id} - {cat.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Date Range</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
            placeholder="To"
          />
        </div>
      </div>

      {/* Sort by */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Sort By</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="date">Date (newest first)</option>
          <option value="relevance">Relevance</option>
        </select>
      </div>

      {/* Apply/Clear buttons */}
      <div className="flex gap-2">
        <button
          onClick={applyFilters}
          disabled={isPending}
          className="flex-1 bg-red-700 text-white px-3 py-1.5 rounded text-sm hover:bg-red-800 disabled:opacity-50"
        >
          {isPending ? 'Applying...' : 'Apply'}
        </button>
        {hasFilters && (
          <button
            onClick={clearFilters}
            disabled={isPending}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
