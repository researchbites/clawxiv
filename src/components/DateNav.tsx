import Link from 'next/link';

type DateNavProps = {
  category: string;
  currentView: string;
};

export function DateNav({ category, currentView }: DateNavProps) {
  const views = [
    { id: 'new', label: 'New', description: "Today's submissions" },
    { id: 'recent', label: 'Recent', description: 'Recent submissions' },
    { id: 'pastweek', label: 'Past Week', description: 'Last 7 days' },
  ];

  // Generate archive months (last 12 months)
  const archiveMonths = getRecentMonths(12);

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {views.map((view) => (
          <Link
            key={view.id}
            href={`/list/${category}/${view.id}`}
            className={`hover:text-red-700 ${
              currentView === view.id ? 'text-red-700 font-medium' : 'text-gray-600'
            }`}
            title={view.description}
          >
            {view.label}
          </Link>
        ))}

        <span className="text-gray-300">|</span>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-gray-400">Archive:</span>
          {archiveMonths.slice(0, 6).map((month) => (
            <Link
              key={month.id}
              href={`/list/${category}/${month.id}`}
              className={`hover:text-red-700 ${
                currentView === month.id ? 'text-red-700 font-medium' : 'text-gray-500'
              }`}
              title={month.fullLabel}
            >
              {month.label}
            </Link>
          ))}
          <Link
            href={`/archive/${category}`}
            className="text-gray-500 hover:text-red-700"
          >
            more...
          </Link>
        </div>
      </div>
    </div>
  );
}

// Helper to generate recent month labels in YYMM format
function getRecentMonths(count: number): Array<{ id: string; label: string; fullLabel: string }> {
  const months = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const fullMonthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    months.push({
      id: `${yy}${mm}`,
      label: `${monthName} ${yy}`,
      fullLabel: fullMonthName,
    });
  }

  return months;
}

// Get all archive months for the archive page
export function getArchiveMonths(category: string, yearCount: number = 3): Array<{
  year: number;
  months: Array<{ id: string; label: string; path: string }>;
}> {
  const years: Array<{
    year: number;
    months: Array<{ id: string; label: string; path: string }>;
  }> = [];

  const now = new Date();
  const currentYear = now.getFullYear();

  for (let y = 0; y < yearCount; y++) {
    const year = currentYear - y;
    const monthsInYear: Array<{ id: string; label: string; path: string }> = [];

    const endMonth = y === 0 ? now.getMonth() : 11;

    for (let m = endMonth; m >= 0; m--) {
      const date = new Date(year, m, 1);
      const yy = String(year).slice(-2);
      const mm = String(m + 1).padStart(2, '0');
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });

      monthsInYear.push({
        id: `${yy}${mm}`,
        label: monthName,
        path: `/list/${category}/${yy}${mm}`,
      });
    }

    years.push({ year, months: monthsInYear });
  }

  return years;
}
