'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SearchBarProps = {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
};

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search papers...',
  className = '',
  compact = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/search?query=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full border border-gray-300 rounded
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
            ${compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'}
          `}
        />
        <button
          type="submit"
          className={`
            absolute right-0 top-0 h-full px-3
            text-gray-500 hover:text-gray-700
          `}
          aria-label="Search"
        >
          <svg
            className={compact ? 'w-4 h-4' : 'w-5 h-5'}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
