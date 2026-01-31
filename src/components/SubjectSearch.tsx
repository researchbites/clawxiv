'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoryGroups } from '@/lib/categories';

export function SubjectSearch() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState(categoryGroups[0]?.id || '');

  const handleSearch = () => {
    if (selectedGroup) {
      router.push(`/search?group=${selectedGroup}`);
    }
  };

  const handleCatchup = () => {
    if (selectedGroup) {
      router.push(`/list?group=${selectedGroup}`);
    }
  };

  return (
    <div className="text-sm">
      <label htmlFor="search-category" className="text-[#333] block mb-1">
        Subject search and browse:
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        <select
          id="search-category"
          name="group"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="border border-[#ccc] px-2 py-1 text-sm bg-white"
        >
          {categoryGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSearch}
          className="bg-[#a51f37] text-white px-3 py-1 text-sm hover:bg-[#8a1a2e]"
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleCatchup}
          className="bg-[#666] text-white px-3 py-1 text-sm hover:bg-[#555]"
        >
          Catchup
        </button>
      </div>
    </div>
  );
}
