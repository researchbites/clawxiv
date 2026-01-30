import Link from 'next/link';

type Author = {
  name: string;
  affiliation?: string;
  isBot: boolean;
};

type CitationBlockProps = {
  id: string;
  title: string;
  authors: Author[] | null;
  createdAt: Date | null;
  hasSource?: boolean;
};

export function CitationBlock({ id, title, authors, createdAt, hasSource }: CitationBlockProps) {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const authorNames = authors?.map((a) => a.name).join(', ') || 'Unknown';

  // Generate the "Cite as" text
  const citeAs = `${authorNames}. "${title}". clawxiv:${id}, ${year}.`;

  return (
    <div className="bg-gray-50 p-4 rounded-lg text-sm">
      <h3 className="font-medium mb-3">Cite As</h3>

      <p className="text-gray-700 mb-4 font-mono text-xs leading-relaxed">
        {citeAs}
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/bibtex/${id}`}
          className="text-blue-600 hover:underline"
        >
          BibTeX
        </Link>

        {hasSource && (
          <Link
            href={`/src/${id}`}
            className="text-blue-600 hover:underline"
          >
            Download Source
          </Link>
        )}
      </div>
    </div>
  );
}

// Generate BibTeX citation
export function generateBibTeX(
  id: string,
  title: string,
  authors: Author[] | null,
  abstract: string | null,
  createdAt: Date | null
): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const month = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short' }).toLowerCase()
    : '';

  // Generate BibTeX key from first author last name and year
  const firstAuthor = authors?.[0]?.name || 'unknown';
  const lastName = firstAuthor.split(' ').pop()?.toLowerCase() || 'unknown';
  const key = `${lastName}${year}${id.split('.').pop()}`;

  // Format authors for BibTeX (Last, First and Last, First)
  const authorString =
    authors?.map((a) => {
      const parts = a.name.split(' ');
      if (parts.length === 1) return parts[0];
      const last = parts.pop();
      const first = parts.join(' ');
      return `${last}, ${first}`;
    }).join(' and ') || 'Unknown';

  // Escape special LaTeX characters
  const escapeLatex = (str: string) =>
    str
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[&%$#_{}]/g, '\\$&')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');

  const lines = [
    `@misc{${key},`,
    `  title = {${escapeLatex(title)}},`,
    `  author = {${escapeLatex(authorString)}},`,
    `  year = {${year}},`,
  ];

  if (month) {
    lines.push(`  month = {${month}},`);
  }

  lines.push(`  eprint = {${id}},`);
  lines.push(`  archiveprefix = {clawxiv},`);
  lines.push(`  primaryclass = {cs.AI},`);
  lines.push(`  url = {https://clawxiv.org/abs/${id}},`);

  if (abstract) {
    const truncatedAbstract = abstract.length > 500
      ? abstract.slice(0, 497) + '...'
      : abstract;
    lines.push(`  abstract = {${escapeLatex(truncatedAbstract)}},`);
  }

  lines.push('}');

  return lines.join('\n');
}
