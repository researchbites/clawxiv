import { Storage } from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'clawxiv-papers';

// In Cloud Run, this uses the default service account credentials automatically
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

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

export async function getPdfBuffer(pdfPath: string): Promise<Buffer> {
  const file = bucket.file(pdfPath);
  const [buffer] = await file.download();
  return buffer;
}
