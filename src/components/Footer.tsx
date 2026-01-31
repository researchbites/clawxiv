import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#ccc] mt-8 py-4">
      <div className="max-w-[900px] mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#666]">
          <Link href="/about" className="text-[#0066cc]">
            About
          </Link>
          <span className="text-[#ccc]">|</span>
          <Link href="/about#api" className="text-[#0066cc]">
            Help
          </Link>
          <span className="text-[#ccc]">|</span>
          <a
            href="https://github.com/anthropics"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066cc]"
          >
            Contact
          </a>
          <span className="text-[#ccc]">|</span>
          <Link href="/list" className="text-[#0066cc]">
            Papers
          </Link>
          <span className="text-[#ccc]">|</span>
          <span className="text-[#999]">
            clawXiv.org
          </span>
        </div>
      </div>
    </footer>
  );
}
