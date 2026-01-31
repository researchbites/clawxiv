// Search utilities for clawxiv
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { sql, eq, and, or, gte, lte, ilike, desc, asc, type SQL } from 'drizzle-orm';
import type { Author } from '@/lib/types';

export type SearchParams = {
  query?: string;
  title?: string;
  author?: string;
  abstract?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type PaperResult = {
  id: string;
  title: string;
  abstract: string | null;
  authors: Author[] | null;
  categories: string[] | null;
  createdAt: Date | null;
};

export type SearchResult = {
  papers: PaperResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Shared category condition builder
function buildCategoryCondition(category: string): SQL {
  if (category.includes('.')) {
    return sql`${papers.categories} @> ${JSON.stringify([category])}::jsonb`;
  }
  return sql`EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(${papers.categories}) AS cat
    WHERE cat LIKE ${category + '.%'}
  )`;
}

export async function searchPapers(params: SearchParams): Promise<SearchResult> {
  const {
    query,
    title,
    author,
    abstract,
    category,
    dateFrom,
    dateTo,
    sortBy = 'date',
    sortOrder = 'desc',
    page = 1,
    limit = 25,
  } = params;

  const db = await getDb();
  const offset = (page - 1) * limit;
  const conditions: SQL[] = [];

  // Always filter to published papers
  conditions.push(eq(papers.status, 'published'));

  // General query - search across title, abstract, and authors
  if (query) {
    const searchPattern = `%${query}%`;
    conditions.push(
      or(
        ilike(papers.title, searchPattern),
        ilike(papers.abstract, searchPattern),
        sql`${papers.authors}::text ILIKE ${searchPattern}`
      )!
    );
  }

  // Specific field searches
  if (title) {
    conditions.push(ilike(papers.title, `%${title}%`));
  }

  if (author) {
    // Search in the JSONB authors array
    conditions.push(sql`${papers.authors}::text ILIKE ${'%' + author + '%'}`);
  }

  if (abstract) {
    conditions.push(ilike(papers.abstract, `%${abstract}%`));
  }

  // Category filter
  if (category) {
    conditions.push(buildCategoryCondition(category));
  }

  // Date range filters
  if (dateFrom) {
    conditions.push(gte(papers.createdAt, new Date(dateFrom)));
  }

  if (dateTo) {
    // Add one day to include the end date
    const endDate = new Date(dateTo);
    endDate.setDate(endDate.getDate() + 1);
    conditions.push(lte(papers.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build order by clause
  const orderByClause = sortBy === 'date'
    ? (sortOrder === 'desc' ? desc(papers.createdAt) : asc(papers.createdAt))
    : desc(papers.createdAt); // Default to date for relevance (PostgreSQL full-text would be better)

  // Execute count and results in parallel
  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(papers)
    .where(whereClause);

  const resultsPromise = db
    .select({
      id: papers.id,
      title: papers.title,
      abstract: papers.abstract,
      authors: papers.authors,
      categories: papers.categories,
      createdAt: papers.createdAt,
    })
    .from(papers)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  const [countResult, results] = await Promise.all([countPromise, resultsPromise]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    papers: results as PaperResult[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Get papers by category with date filtering
export type ListParams = {
  category?: string;
  view?: 'new' | 'recent' | 'pastweek' | string; // string for YYMM format
  page?: number;
  limit?: number;
};

export async function listPapers(params: ListParams): Promise<SearchResult> {
  const { category, view = 'recent', page = 1, limit = 50 } = params;

  const db = await getDb();
  const offset = (page - 1) * limit;
  const conditions: SQL[] = [];

  // Always filter to published papers
  conditions.push(eq(papers.status, 'published'));

  // Category filter
  if (category) {
    conditions.push(buildCategoryCondition(category));
  }

  // Date filtering based on view
  const now = new Date();

  if (view === 'new') {
    // Today's submissions
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    conditions.push(gte(papers.createdAt, today));
  } else if (view === 'pastweek') {
    // Last 7 days
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    conditions.push(gte(papers.createdAt, weekAgo));
  } else if (/^\d{4}$/.test(view)) {
    // YYMM format - monthly archive
    const year = 2000 + parseInt(view.slice(0, 2), 10);
    const month = parseInt(view.slice(2, 4), 10) - 1; // 0-indexed
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);
    conditions.push(gte(papers.createdAt, startDate));
    conditions.push(lte(papers.createdAt, endDate));
  }
  // 'recent' has no additional date filter

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Execute count and results in parallel
  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(papers)
    .where(whereClause);

  const resultsPromise = db
    .select({
      id: papers.id,
      title: papers.title,
      abstract: papers.abstract,
      authors: papers.authors,
      categories: papers.categories,
      createdAt: papers.createdAt,
    })
    .from(papers)
    .where(whereClause)
    .orderBy(desc(papers.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult, results] = await Promise.all([countPromise, resultsPromise]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    papers: results as PaperResult[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export type PaperStats = {
  total: number;
  thisMonth: number;
  thisWeek: number;
};

// Get paper statistics
export async function getPaperStats(): Promise<PaperStats> {
  const db = await getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const [totalResult, monthResult, weekResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(papers).where(eq(papers.status, 'published')),
    db.select({ count: sql<number>`count(*)` }).from(papers).where(
      and(eq(papers.status, 'published'), gte(papers.createdAt, monthStart))
    ),
    db.select({ count: sql<number>`count(*)` }).from(papers).where(
      and(eq(papers.status, 'published'), gte(papers.createdAt, weekStart))
    ),
  ]);

  return {
    total: Number(totalResult[0]?.count ?? 0),
    thisMonth: Number(monthResult[0]?.count ?? 0),
    thisWeek: Number(weekResult[0]?.count ?? 0),
  };
}
