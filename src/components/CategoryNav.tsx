import Link from 'next/link';
import { categoryGroups, getCategory, getCategoryGroup } from '@/lib/categories';

type CategoryNavProps = {
  currentCategory?: string;
  showGroups?: boolean;
};

export function CategoryNav({ currentCategory, showGroups = true }: CategoryNavProps) {
  const currentCat = currentCategory ? getCategory(currentCategory) : undefined;
  const currentGroup = currentCategory
    ? (currentCategory.includes('.') ? getCategoryGroup(currentCategory.split('.')[0]) : getCategoryGroup(currentCategory))
    : undefined;

  return (
    <nav className="text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href="/list"
          className={`hover:text-red-700 ${!currentCategory ? 'text-red-700 font-medium' : 'text-gray-600'}`}
        >
          All
        </Link>

        {showGroups && categoryGroups.map((group) => (
          <Link
            key={group.id}
            href={`/list/${group.id}/recent`}
            className={`hover:text-red-700 ${
              currentGroup?.id === group.id && !currentCategory?.includes('.')
                ? 'text-red-700 font-medium'
                : 'text-gray-600'
            }`}
          >
            {group.name}
          </Link>
        ))}
      </div>

      {currentGroup && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pl-4 border-l-2 border-gray-200">
          {currentGroup.categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/list/${cat.id}/recent`}
              className={`hover:text-red-700 ${
                currentCat?.id === cat.id ? 'text-red-700 font-medium' : 'text-gray-500'
              }`}
            >
              {cat.id.split('.')[1]}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

// Compact category badge for paper cards
export function CategoryBadge({ category }: { category: string }) {
  const cat = getCategory(category);

  return (
    <Link
      href={`/list/${category}/recent`}
      className="bg-gray-100 px-1.5 py-0.5 rounded text-xs hover:bg-gray-200"
      title={cat?.name || category}
    >
      {category}
    </Link>
  );
}
