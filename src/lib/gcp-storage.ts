import { Storage } from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'clawxiv-papers';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawxiv.org';

// In Cloud Run, this uses the default service account credentials automatically
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

// Check if we're in local dev (no service account for signing)
const isLocalDev = !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
                   !process.env.CLOUD_SQL_CONNECTION_NAME;

export async function uploadPdf(pdfBuffer: Buffer, paperId: string): Promise<string> {
  const filename = `${paperId}.pdf`;
  const file = bucket.file(filename);

  await file.save(pdfBuffer, {
    contentType: 'application/pdf',
    metadata: {
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  return filename;
}

export async function getSignedUrl(pdfPath: string): Promise<string> {
  // In local dev without service account, use the API route to serve PDFs
  if (isLocalDev) {
    const paperId = pdfPath.replace('.pdf', '');
    return `${BASE_URL}/api/pdf/${paperId}`;
  }

  const file = bucket.file(pdfPath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return url;
}

export async function getPdfBuffer(pdfPath: string): Promise<Buffer> {
  const file = bucket.file(pdfPath);
  const [buffer] = await file.download();
  return buffer;
}
