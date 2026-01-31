import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSignedUrl } from '@/lib/gcp-storage';

type Props = {
  params: Promise<{ id: string }>;
};

async function getPaper(id: string) {
  try {
    const db = await getDb();
    const result = await db
      .select({
        id: papers.id,
        title: papers.title,
        pdfPath: papers.pdfPath,
        status: papers.status,
      })
      .from(papers)
      .where(eq(papers.id, id))
      .limit(1);

    if (result.length === 0 || result[0].status !== 'published') {
      return null;
    }

    return result[0];
  } catch {
    return null;
  }
}

export default async function PdfPage({ params }: Props) {
  const { id } = await params;
  const paper = await getPaper(id);

  if (!paper || !paper.pdfPath) {
    notFound();
  }

  const pdfUrl = await getSignedUrl(paper.pdfPath);

  return (
    <div className="h-[calc(100vh-200px)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-medium truncate">{paper.title}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/abs/${id}`} className="text-blue-600 hover:underline">
            Abstract
          </Link>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:underline"
          >
            Download
          </a>
        </div>
      </div>

      <iframe
        src={pdfUrl}
        className="w-full h-full border rounded"
        title={paper.title}
      />
    </div>
  );
}
