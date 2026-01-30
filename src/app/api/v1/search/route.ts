import { NextRequest, NextResponse } from 'next/server';
import { searchPapers, type SearchParams } from '@/lib/search';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: SearchParams = {
      query: searchParams.get('query') || undefined,
      title: searchParams.get('title') || undefined,
      author: searchParams.get('author') || undefined,
      abstract: searchParams.get('abstract') || undefined,
      category: searchParams.get('category') || undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
      sortBy: (searchParams.get('sort_by') as 'date' | 'relevance') || 'date',
      sortOrder: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: Math.min(parseInt(searchParams.get('limit') || '25', 10), 200),
    };

    const result = await searchPapers(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
