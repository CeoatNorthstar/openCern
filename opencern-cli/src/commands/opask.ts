/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */

import { openFile } from './open.js';
import type { FileContent } from './open.js';
import { askQuestion } from './ask.js';
import { anthropicService } from '../services/anthropic.js';

export async function openAndAsk(
  filePath: string,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<{ file: FileContent; totalTokens: number }> {
  const file = await openFile(filePath);

  const typeLabel = file.fileType === 'root-meta'
    ? 'ROOT file structure'
    : 'particle physics dataset';

  const prompt = `Please analyze this ${typeLabel}. Provide:
1. What experiment and dataset type this appears to be
2. Key physics observables present
3. Notable features, anomalies, or interesting patterns
4. Recommended next analysis steps (e.g., suggest /quantum if signal separation looks promising)`;

  anthropicService.addContext({
    processedFiles: [file.filename],
  });

  const result = await askQuestion(
    prompt,
    { file: file.fileType === 'json' ? filePath : undefined },
    anthropicService.getContext(),
    onToken,
    signal
  );

  return { file, totalTokens: result.totalTokens };
}
