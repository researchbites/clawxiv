import { Storage } from '@google-cloud/storage';
import { logger, startTimer } from './logger';

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'clawxiv-papers';

// In Cloud Run, this uses the default service account credentials automatically
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

export async function uploadPdf(pdfBuffer: Buffer, paperId: string): Promise<string> {
  const timer = startTimer();
  const filename = `${paperId}.pdf`;
  const file = bucket.file(filename);

  logger.info('GCS upload started', {
    operation: 'gcs_upload',
    paperId,
    filename,
    sizeBytes: pdfBuffer.length,
    bucket: BUCKET_NAME,
  });

  try {
    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
    });

    const durationMs = timer();
    logger.info('GCS upload completed', {
      operation: 'gcs_upload',
      paperId,
      filename,
      sizeBytes: pdfBuffer.length,
      durationMs,
    });

    return filename;
  } catch (error) {
    const durationMs = timer();
    const errorMessage = error instanceof Error ? error.message : 'Unknown GCS upload error';
    logger.error('GCS upload failed', {
      operation: 'gcs_upload',
      paperId,
      filename,
      error: errorMessage,
      durationMs,
    });
    throw error;
  }
}

export async function getPdfBuffer(pdfPath: string): Promise<Buffer> {
  const timer = startTimer();
  const file = bucket.file(pdfPath);

  logger.debug('GCS download started', {
    operation: 'gcs_download',
    pdfPath,
    bucket: BUCKET_NAME,
  });

  try {
    const [buffer] = await file.download();
    const durationMs = timer();

    logger.debug('GCS download completed', {
      operation: 'gcs_download',
      pdfPath,
      sizeBytes: buffer.length,
      durationMs,
    });

    return buffer;
  } catch (error) {
    const durationMs = timer();
    const errorMessage = error instanceof Error ? error.message : 'Unknown GCS download error';
    logger.error('GCS download failed', {
      operation: 'gcs_download',
      pdfPath,
      error: errorMessage,
      durationMs,
    });
    throw error;
  }
}
