/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../utils/config.js';
import { getToken } from '../utils/auth.js';

export interface Dataset {
  id: string;
  title: string;
  description?: string;
  experiment: string;
  year: number;
  energy: string;
  size: number;
  files: string[];
}

export interface DownloadStatus {
  id: string;
  status: 'pending' | 'downloading' | 'complete' | 'error';
  progress: number;
  speed: number;
  eta: number;
  error?: string;
}

export interface ProcessStatus {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  currentFile?: string;
  results?: ProcessResults;
  error?: string;
}

export interface ProcessResults {
  eventCount: number;
  particles: Record<string, number>;
  peakHT: number;
  experiment: string;
  outputFile: string;
}

export interface LocalFile {
  name: string;
  path: string;
  size: number;
  type: 'root' | 'json' | 'other';
  modified: string;
}

function normalizeError(err: unknown): Error {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.detail || err.response?.data?.message || err.message;
    const code = err.response?.status;
    const retryable = !code || code >= 500 || code === 429;
    const error = new Error(msg) as Error & { code?: number; retryable?: boolean };
    error.code = code;
    error.retryable = retryable;
    return error;
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: Error = new Error('Unknown error');
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = normalizeError(err);
      const retryable = (lastErr as Error & { retryable?: boolean }).retryable;
      if (!retryable || i === attempts - 1) throw lastErr;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

function createClient(): AxiosInstance {
  const baseURL = config.get('apiBaseUrl');
  const token = getToken();
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return client;
}

export const cernApi = {
  async health(): Promise<{ status: string; version: string }> {
    return withRetry(async () => {
      const res = await createClient().get('/health');
      return res.data;
    });
  },

  async searchDatasets(query: string, experiment: string = 'all', year?: number): Promise<Dataset[]> {
    return withRetry(async () => {
      const res = await createClient().get('/datasets', {
        params: { experiment, size: 50 },
      });
      let datasets: Dataset[] = res.data.datasets || [];
      
      const q = query.toLowerCase().trim();
      if (q) {
        datasets = datasets.filter(d => 
          d.title.toLowerCase().includes(q) || 
          (d.description && d.description.toLowerCase().includes(q)) || 
          d.id.toLowerCase() === q
        );
      }
      if (year) {
        datasets = datasets.filter(d => d.year === year);
      }
      return datasets;
    });
  },

  async startDownload(dataset: Dataset, selectedFiles?: string[]): Promise<{ id: string }> {
    return withRetry(async () => {
      const files = selectedFiles && selectedFiles.length > 0 ? selectedFiles : dataset.files;
      const res = await createClient().post('/download/multi', { 
        dataset_title: dataset.title, 
        files 
      });
      return res.data;
    });
  },

  async downloadStatus(id: string): Promise<DownloadStatus> {
    const res = await createClient().get('/download/status', { params: { filename: id } });
    return res.data;
  },

  async cancelDownload(id: string): Promise<void> {
    await createClient().post('/downloads/cancel', { id });
  },

  async listFiles(folder?: string): Promise<LocalFile[]> {
    return withRetry(async () => {
      const path = folder ? `/files/${folder}` : '/files';
      const res = await createClient().get(path);
      return res.data;
    });
  },

  async deleteFile(name: string): Promise<void> {
    await createClient().delete(`/files/${encodeURIComponent(name)}`);
  },

  async processFile(filePath: string): Promise<{ id: string }> {
    return withRetry(async () => {
      const res = await createClient().post('/process', { file: filePath });
      return res.data;
    });
  },

  async processFolder(folderPath: string): Promise<{ id: string }> {
    return withRetry(async () => {
      const res = await createClient().post('/process/folder', { folder: folderPath });
      return res.data;
    });
  },

  async processStatus(id: string): Promise<ProcessStatus> {
    const res = await createClient().get('/process/status', { params: { id } });
    return res.data;
  },

  async getRootMetadata(filePath: string): Promise<Record<string, unknown>> {
    return withRetry(async () => {
      const res = await createClient().get('/files/root-metadata', { params: { file: filePath } });
      return res.data;
    });
  },
};

export default cernApi;
