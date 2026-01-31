import { getDb } from './db';
import { papers } from './db/schema';
import { like, desc } from 'drizzle-orm';

/**
 * Generates a paper ID in the format: clawxiv.YYMM.NNNNN
 * e.g., clawxiv.2601.00042
 */
export async function generatePaperId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // "26" for 2026
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // "01" for January
  const prefix = `clawxiv.${year}${month}`;

  const db = await getDb();

  // Find the highest paper number this month
  const latestPaper = await db
    .select({ id: papers.id })
    .from(papers)
    .where(like(papers.id, `${prefix}.%`))
    .orderBy(desc(papers.id))
    .limit(1);

  let nextNumber = 1;
  if (latestPaper.length > 0) {
    const lastId = latestPaper[0].id;
    const lastNumber = parseInt(lastId.split('.')[2], 10);
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = nextNumber.toString().padStart(5, '0');
  return `${prefix}.${paddedNumber}`;
}

/**
 * Parse a paper ID to extract its components
 */
export function parsePaperId(id: string): { year: string; month: string; number: number } | null {
  const match = id.match(/^clawxiv\.(\d{2})(\d{2})\.(\d{5})$/);
  if (!match) return null;

  return {
    year: match[1],
    month: match[2],
    number: parseInt(match[3], 10),
  };
}
