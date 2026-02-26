import { readFileSync, existsSync } from 'fs';
import { anthropicService } from '../services/anthropic.js';
import type { SessionContext } from '../services/anthropic.js';

export interface AskOptions {
  file?: string;
  explain?: boolean;
}

export async function askQuestion(
  question: string,
  options: AskOptions,
  context: SessionContext,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<{ totalTokens: number }> {
  let message = question;

  if (options.file) {
    if (!existsSync(options.file)) {
      throw new Error(`File not found: ${options.file}`);
    }
    const content = readFileSync(options.file, 'utf-8');
    const truncated = content.length > 50_000
      ? content.slice(0, 50_000) + '\n...[truncated]'
      : content;
    message = `${question}\n\nFile: ${options.file}\n\`\`\`json\n${truncated}\n\`\`\``;
  }

  if (options.explain) {
    message = `Please explain the results from the last operation in detail. ${message}`;
  }

  anthropicService.addContext(context);

  return anthropicService.streamMessage(message, onToken, signal);
}

export function clearConversation(): void {
  anthropicService.clearHistory();
}
