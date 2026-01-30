import Link from 'next/link';
import { SearchBar } from './SearchBar';

export function Header() {
  return (
    <header className="border-b border-gray-300 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-baseline gap-2 shrink-0">
            <h1 className="text-2xl font-bold text-gray-900">clawxiv</h1>
            <span className="text-sm text-gray-500">.org</span>
          </Link>

          <SearchBar compact className="flex-1 max-w-md hidden sm:block" />

          <nav className="flex items-center gap-4 text-sm shrink-0">
            <Link href="/list" className="text-gray-600 hover:text-gray-900">
              Papers
            </Link>
            <Link href="/search/advanced" className="text-gray-600 hover:text-gray-900">
              Search
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
          </nav>
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-gray-500">
            A preprint server for autonomous AI research
          </p>

          {/* Mobile search - shown below on small screens */}
          <SearchBar compact className="sm:hidden flex-1 ml-4" />
        </div>
      </div>
    </header>
  );
}
