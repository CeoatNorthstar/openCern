/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
import axios, { AxiosError } from 'axios';
import { config } from '../utils/config.js';
import { getToken } from '../utils/auth.js';
function normalizeError(err) {
    if (err instanceof AxiosError) {
        const msg = err.response?.data?.detail || err.response?.data?.message || err.message;
        const code = err.response?.status;
        const retryable = !code || code >= 500 || code === 429;
        const error = new Error(msg);
        error.code = code;
        error.retryable = retryable;
        return error;
    }
    return err instanceof Error ? err : new Error(String(err));
}
async function withRetry(fn, attempts = 3) {
    let lastErr = new Error('Unknown error');
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (err) {
            lastErr = normalizeError(err);
            const retryable = lastErr.retryable;
            if (!retryable || i === attempts - 1)
                throw lastErr;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
    }
    throw lastErr;
}
function createClient() {
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
    async health() {
        return withRetry(async () => {
            const res = await createClient().get('/health');
            return res.data;
        });
    },
    async searchDatasets(query, experiment = 'all', year) {
        return withRetry(async () => {
            const res = await createClient().get('/datasets', {
                params: { experiment, size: 50 },
            });
            let datasets = res.data.datasets || [];
            const q = query.toLowerCase().trim();
            if (q) {
                datasets = datasets.filter(d => d.title.toLowerCase().includes(q) ||
                    (d.description && d.description.toLowerCase().includes(q)) ||
                    d.id.toLowerCase() === q);
            }
            if (year) {
                datasets = datasets.filter(d => d.year === year);
            }
            return datasets;
        });
    },
    async startDownload(dataset, selectedFiles) {
        return withRetry(async () => {
            const files = selectedFiles && selectedFiles.length > 0 ? selectedFiles : dataset.files.map(f => f.url);
            const res = await createClient().post('/download/multi', {
                dataset_title: dataset.title,
                files
            });
            return res.data;
        });
    },
    async downloadStatus(id) {
        const res = await createClient().get('/download/status', { params: { folder: id } });
        return res.data;
    },
    async cancelDownload(id) {
        await createClient().post('/downloads/cancel', { id });
    },
    async listFiles(folder) {
        return withRetry(async () => {
            const path = folder ? `/files/${folder}` : '/files';
            const res = await createClient().get(path);
            return res.data;
        });
    },
    async deleteFile(name) {
        await createClient().delete(`/files/${encodeURIComponent(name)}`);
    },
    async processFile(filePath) {
        return withRetry(async () => {
            const res = await createClient().post('/process', { file: filePath });
            return res.data;
        });
    },
    async processFolder(folderPath) {
        return withRetry(async () => {
            const res = await createClient().post('/process/folder', { folder: folderPath });
            return res.data;
        });
    },
    async processStatus(id) {
        const res = await createClient().get('/process/status', { params: { id } });
        return res.data;
    },
    async getRootMetadata(filePath) {
        return withRetry(async () => {
            const res = await createClient().get('/files/root-metadata', { params: { file: filePath } });
            return res.data;
        });
    },
};
export default cernApi;
//# sourceMappingURL=cern-api.js.map