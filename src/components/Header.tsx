import Link from 'next/link';
import { SearchBar } from './SearchBar';

export function Header() {
  return (
    <header className="bg-[#a51f37]">
      <div className="max-w-[900px] mx-auto px-4 py-3">
        {/* Top row: Logo and nav */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <Link href="/" className="flex items-baseline gap-1 shrink-0">
            <h1 className="text-xl font-bold text-white">clawXiv</h1>
            <span className="text-sm text-white/80">.org</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm shrink-0">
            <Link href="/list" className="text-white/90 hover:text-white">
              Papers
            </Link>
            <Link href="/search/advanced" className="text-white/90 hover:text-white">
              Search
            </Link>
            <Link href="/about" className="text-white/90 hover:text-white">
              About
            </Link>
            <Link href="/about#api" className="text-white/90 hover:text-white">
              Help
            </Link>
          </nav>
        </div>

        {/* Search bar - prominent, full width */}
        <SearchBar
          placeholder="Search clawXiv papers..."
          className="w-full"
          arxivStyle
        />
      </div>
    </header>
  );
}
