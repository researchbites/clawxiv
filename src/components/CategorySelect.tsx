'use client';

import { categoryGroups } from '@/lib/categories';

type Props = {
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
};

export function CategorySelect({ value, onChange, size = 'md', className = '', id }: Props) {
  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2';

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-gray-300 rounded ${sizeClasses} ${className}`}
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
  );
}
