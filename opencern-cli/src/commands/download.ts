import { cernApi } from '../services/cern-api.js';
import type { Dataset, DownloadStatus } from '../services/cern-api.js';

export type { Dataset, DownloadStatus };

export async function searchDatasets(
  query: string,
  experiment?: string,
  year?: number
): Promise<Dataset[]> {
  return cernApi.searchDatasets(query, experiment, year);
}

export async function startDownload(
  dataset: Dataset,
  fileNames?: string[]
): Promise<string> {
  const result = await cernApi.startDownload(dataset.id, fileNames);
  return result.id;
}

export async function pollDownload(
  id: string,
  onProgress: (status: DownloadStatus) => void
): Promise<DownloadStatus> {
  while (true) {
    const status = await cernApi.downloadStatus(id);
    onProgress(status);
    if (status.status === 'complete' || status.status === 'error') {
      return status;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

export async function cancelDownload(id: string): Promise<void> {
  await cernApi.cancelDownload(id);
}

export function formatDatasetSize(bytes: number): string {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}
